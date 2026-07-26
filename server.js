/**
 * server.js — cPanel Node.js Selector startup file
 *
 * cPanel expects a file named server.js in the project root.
 * This auto-generates AUTH_SECRET on first boot if not set,
 * then starts the Next.js production server.
 *
 * NextAuth v5 reads AUTH_SECRET (not NEXTAUTH_SECRET) — keep this in sync with
 * src/lib/env.ts or sessions will invalidate unpredictably across restarts.
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = __dirname
const ENV_FILE = path.join(ROOT, '.env.local')

// ── Auto-generate AUTH_SECRET if missing ──────────────────────────────────
function ensureSecret() {
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : ''

  // Backward-compat: migrate an old NEXTAUTH_SECRET-only file to also define AUTH_SECRET
  if (!content.includes('AUTH_SECRET=') && !process.env.AUTH_SECRET) {
    const legacyMatch = content.match(/^NEXTAUTH_SECRET="?([^"\n]*)"?$/m)
    const secret = legacyMatch ? legacyMatch[1] : crypto.randomBytes(32).toString('base64')
    content = `AUTH_SECRET="${secret}"\n${content}`
    fs.writeFileSync(ENV_FILE, content, 'utf-8')
    console.log('[ismart] AUTH_SECRET generated and saved to .env.local')
    return true // signals a restart may be helpful but not required
  }
  return false
}

// ── Load .env.local into process.env ─────────────────────────────────────────
function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return
  const lines = fs.readFileSync(ENV_FILE, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
    if (match) {
      process.env[match[1]] = match[2]
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
ensureSecret()
loadEnv()

const port = process.env.PORT || 3000
const hostname = process.env.HOSTNAME || '0.0.0.0'

console.log(`[ismart] Starting portal on port ${port}…`)

// Start Next.js production server
const next = spawn(
  'node',
  ['node_modules/next/dist/bin/next', 'start', '--port', String(port), '--hostname', hostname],
  {
    stdio: 'inherit',
    env: process.env,
    cwd: ROOT,
  },
)

next.on('exit', (code) => {
  console.log(`[ismart] Server exited with code ${code}`)
  process.exit(code ?? 0)
})

process.on('SIGTERM', () => next.kill('SIGTERM'))
process.on('SIGINT', () => next.kill('SIGINT'))
