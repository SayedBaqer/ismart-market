import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'home.sections' } })
    return NextResponse.json({ value: setting?.value ?? null })
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!Array.isArray(body)) return NextResponse.json({ error: 'Expected array' }, { status: 400 })

  try {
    await prisma.setting.upsert({
      where: { key: 'home.sections' },
      create: { key: 'home.sections', value: JSON.stringify(body) },
      update: { value: JSON.stringify(body) },
    })
    revalidatePath('/')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('store sections save error', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
