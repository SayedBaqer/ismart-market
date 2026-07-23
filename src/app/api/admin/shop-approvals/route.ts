import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const shops = await prisma.shop.findMany({
    select: { id: true, name: true, slug: true, settings: true },
    orderBy: { createdAt: 'desc' },
  })

  const pending = shops
    .map((shop) => {
      const settings = (shop.settings ?? {}) as Record<string, unknown>
      const displayPending = settings.displayPending as Record<string, unknown> | null
      if (!displayPending || displayPending.status !== 'pending') return null
      return {
        shopId: shop.id,
        shopName: shop.name,
        shopSlug: shop.slug,
        pending: displayPending,
      }
    })
    .filter(Boolean)

  return NextResponse.json(pending)
}
