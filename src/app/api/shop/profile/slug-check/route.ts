import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim().toLowerCase()
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 60) {
    return NextResponse.json({ available: false, reason: 'Use lowercase letters, numbers and single dashes only (3-60 chars)' })
  }

  const existing = await prisma.shop.findUnique({ where: { slug }, select: { id: true } })
  const available = !existing || existing.id === shopUser.shopId
  return NextResponse.json({ available })
}
