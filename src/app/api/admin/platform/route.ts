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

  const [shopStats, planDist, revenueByShop, recentActivity, pendingApprovals] = await Promise.all([
    prisma.shop.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.shop.groupBy({ by: ['plan'], _count: { id: true } }),
    prisma.order.groupBy({
      by: ['shopId'],
      _sum: { grandTotal: true },
      _count: { id: true },
      where: { status: 'COMPLETED', shopId: { not: null } },
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: 5,
    }),
    prisma.order.findMany({
      where: { shopId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, orderNumber: true, status: true, grandTotal: true, currency: true, createdAt: true,
        shop: { select: { name: true, slug: true } },
        customerName: true,
      },
    }),
    prisma.shop.count({
      where: {
        OR: [
          { status: 'PENDING' },
          // shops with pending display settings — approximated via JSON; full check done in approvals API
        ],
      },
    }),
  ])

  const totalShops = shopStats.reduce((a, s) => a + s._count.id, 0)
  const activeShops = shopStats.find((s) => s.status === 'ACTIVE')?._count.id ?? 0
  const pendingShops = shopStats.find((s) => s.status === 'PENDING')?._count.id ?? 0

  // Enrich revenue leaders with shop name
  const topShopIds = revenueByShop.map((r) => r.shopId).filter(Boolean) as string[]
  const topShopNames = await prisma.shop.findMany({
    where: { id: { in: topShopIds } },
    select: { id: true, name: true, slug: true, logoUrl: true },
  })
  const nameMap = Object.fromEntries(topShopNames.map((s) => [s.id, s]))

  const leaderboard = revenueByShop.map((r) => ({
    shopId: r.shopId,
    shopName: nameMap[r.shopId!]?.name ?? 'Unknown',
    shopSlug: nameMap[r.shopId!]?.slug ?? '',
    logoUrl: nameMap[r.shopId!]?.logoUrl ?? null,
    revenue: Number(r._sum.grandTotal ?? 0),
    orders: r._count.id,
  }))

  return NextResponse.json({
    totalShops,
    activeShops,
    pendingShops,
    planDistribution: planDist.map((p) => ({ plan: p.plan, count: p._count.id })),
    leaderboard,
    recentActivity,
    statusBreakdown: shopStats,
  })
}
