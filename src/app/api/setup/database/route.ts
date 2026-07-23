import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { rateLimit, rlKey, tooManyRequests } from '@/lib/rate-limit'

type Provider = 'postgresql' | 'mysql'

/**
 * Run a prisma command using the current Node binary directly.
 * Writes DATABASE_URL to .env so Prisma's own dotenv loading finds it.
 */
function runPrisma(args: string[], dbUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, DATABASE_URL: dbUrl },
      cwd: process.cwd(),
      stdio: 'pipe',
    })

    const out: string[] = []
    const err: string[] = []
    child.stdout?.on('data', (d: Buffer) => out.push(d.toString()))
    child.stderr?.on('data', (d: Buffer) => err.push(d.toString()))
    child.on('close', (code) => {
      const combined = out.join('') + err.join('')
      if (code === 0) resolve(combined)
      else reject({ stdout: out.join(''), stderr: err.join(''), code })
    })
    child.on('error', (e) => reject({ message: e.message, stderr: '', stdout: '' }))
  })
}

function patchSchema(provider: Provider) {
  const p = path.join(process.cwd(), 'prisma', 'schema.prisma')
  const schema = fs.readFileSync(p, 'utf-8').replace(
    /provider\s*=\s*"(postgresql|mysql)"/,
    `provider = "${provider}"`,
  )
  fs.writeFileSync(p, schema, 'utf-8')
}

/** Write/update a key in .env.local (for Next.js) */
function writeEnvLocal(key: string, value: string) {
  const p = path.join(process.cwd(), '.env.local')
  let c = fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : ''
  c = c.split('\n').filter((l) => !l.startsWith(`${key}=`)).join('\n').trimStart()
  fs.writeFileSync(p, `${key}="${value}"\n${c}`, 'utf-8')
}

/** Write/update a key in .env (for Prisma CLI) */
function writeEnvPrisma(key: string, value: string) {
  const p = path.join(process.cwd(), '.env')
  let c = fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : ''
  c = c.split('\n').filter((l) => !l.startsWith(`${key}=`)).join('\n').trimStart()
  fs.writeFileSync(p, `${key}="${value}"\n${c}`, 'utf-8')
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(rlKey(req, 'setup:db'), { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return tooManyRequests(rl.resetAt)

  const body = await req.json()
  const { host, port, database, username, password, provider = 'mysql' } = body as {
    host: string; port: string; database: string
    username: string; password: string; provider: Provider
  }

  if (!host || !database || !username) {
    return NextResponse.json({ error: 'Host, database, and username are required' }, { status: 400 })
  }

  const scheme = provider === 'mysql' ? 'mysql' : 'postgresql'
  const encodedUser = encodeURIComponent(String(username))
  const encodedPass = password ? encodeURIComponent(String(password)) : ''
  const portNum = port || (provider === 'mysql' ? '3306' : '5432')
  const dbUrl = `${scheme}://${encodedUser}${encodedPass ? `:${encodedPass}` : ''}@${host}:${portNum}/${database}`

  try {
    // 1. Patch prisma/schema.prisma provider
    patchSchema(provider)

    // 2. Write DATABASE_URL to .env so Prisma CLI finds it
    writeEnvPrisma('DATABASE_URL', dbUrl)

    // 3. Push schema to the database (creates all tables)
    //    --skip-generate: client already generated during build
    //    --accept-data-loss: ok for first-time setup
    await runPrisma(['db', 'push', '--skip-generate', '--accept-data-loss'], dbUrl)

    // 4. Persist to .env.local for Next.js runtime
    writeEnvLocal('DATABASE_URL', dbUrl)
    writeEnvLocal('DATABASE_PROVIDER', provider)

    // 5. Update process.env in-place — Prisma will reconnect on next request
    process.env.DATABASE_URL = dbUrl
    process.env.DATABASE_PROVIDER = provider

    return NextResponse.json({ ok: true, skipRestart: true })
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string }
    const allOutput = `${e.stderr ?? ''}\n${e.stdout ?? ''}`
    const detail =
      allOutput
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /error|denied|refused|unknown|failed|Cannot|connect|ECONNREFUSED|does not exist|Access/i.test(l))
        .slice(0, 3)
        .join(' — ') || e.message || 'Connection failed — check your credentials'

    // Restore schema on failure
    try { patchSchema('postgresql') } catch { /* ignore */ }

    return NextResponse.json({ error: 'Database setup failed', detail }, { status: 400 })
  }
}
