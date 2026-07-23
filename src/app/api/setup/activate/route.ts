import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/setup/activate
 *
 * Verifies setup is complete in the DB, stamps the setup_completed cookie via
 * a proper HTTP redirect (the only reliable way to set cookies on iOS Safari),
 * then sends the browser to /admin/login.
 */
export async function GET(req: NextRequest) {
  const base = new URL(req.url).origin

  try {
    await prisma.$queryRaw`SELECT 1`
    const setting = await prisma.setting.findUnique({ where: { key: 'setup.completed' } })

    if (setting?.value !== 'true') {
      return NextResponse.redirect(new URL('/setup', base))
    }

    const res = NextResponse.redirect(new URL('/admin/login', base))

    res.cookies.set('setup_completed', 'true', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })

    return res
  } catch {
    return NextResponse.redirect(new URL('/setup', base))
  }
}
