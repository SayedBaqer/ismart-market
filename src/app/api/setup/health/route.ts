import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    const setting = await prisma.setting.findUnique({ where: { key: 'setup.completed' } })
    const setupCompleted = setting?.value === 'true'

    const res = NextResponse.json({ dbConnected: true, setupCompleted })

    // Plant the cookie for any browser that doesn't have it yet (e.g. mobile on LAN)
    if (setupCompleted) {
      res.cookies.set('setup_completed', 'true', {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    return res
  } catch {
    return NextResponse.json({ dbConnected: false, setupCompleted: false })
  }
}
