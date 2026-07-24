import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: (session.user as { id: string }).id } })
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const shopId = shopUser.shopId

  // Revenue from completed orders
  const [completedAgg, pendingAgg, cancelledAgg, recentOrders, dailyRows] = await Promise.all([
    prisma.order.aggregate({
      where: { shopId, status: 'COMPLETED' },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { shopId, status: { in: ['PENDING', 'CONFIRMED', 'PREPARED', 'IN_DELIVERY'] } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { shopId, status: 'CANCELLED' },
      _count: { id: true },
    }),
    prisma.order.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        orderNumber: true, status: true, grandTotal: true, currency: true,
        createdAt: true, customerName: true,
        customer: { select: { displayName: true } },
      },
    }),
    // Daily revenue for last 14 days
    prisma.$queryRaw<{ day: string; total: number; count: number }[]>`
      SELECT
        DATE(created_at) as day,
        SUM(CAST(grand_total AS FLOAT)) as total,
        COUNT(*) as count
      FROM orders
      WHERE shop_id = ${shopId}
        AND status = 'COMPLETED'
        AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `,
  ])

  // Fetch commission settings
  const commissionSetting = await prisma.setting.findUnique({ where: { key: 'platform.commission' } })
  let commissionRate = 0
  let commissionType = 'percentage'
  if (commissionSetting?.value) {
    try {
      const c = JSON.parse(commissionSetting.value as string)
      commissionType = c.salesType ?? 'percentage'
      commissionRate = Number(c.salesValue ?? 0)
    } catch { /* ignore */ }
  }

  const totalRevenue = Number(completedAgg._sum.grandTotal ?? 0)
  const pendingRevenue = Number(pendingAgg._sum.grandTotal ?? 0)
  const commissionOwed = commissionType === 'percentage'
    ? totalRevenue * (commissionRate / 100)
    : completedAgg._count.id * commissionRate
  const netEarnings = totalRevenue - commissionOwed

  return NextResponse.json({
    totalRevenue,
    pendingRevenue,
    commissionOwed,
    commissionRate,
    commissionType,
    netEarnings,
    completedCount: completedAgg._count.id,
    pendingCount: pendingAgg._count.id,
    cancelledCount: cancelledAgg._count.id,
    recentOrders,
    dailyRevenue: dailyRows.map((r) => ({ day: String(r.day), total: Number(r.total), count: Number(r.count) })),
  })
}
