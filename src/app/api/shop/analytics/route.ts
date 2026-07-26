import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({
    where: { userId: (session.user as { id: string }).id },
  })
  if (!shopUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const shopId = shopUser.shopId
  const now = new Date()

  // Time windows
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const start30 = new Date(now); start30.setDate(now.getDate() - 29); start30.setHours(0, 0, 0, 0)
  const start7 = new Date(now); start7.setDate(now.getDate() - 6); start7.setHours(0, 0, 0, 0)

  const [
    todayAgg, weekAgg, monthAgg, allTimeAgg,
    statusCounts,
    topProductsRev, topProductsViews,
    customerCount, newCustomers,
    daily30,
    recentCompleted,
  ] = await Promise.all([
    // Revenue aggregations
    prisma.order.aggregate({ where: { shopId, status: 'COMPLETED', createdAt: { gte: startOfToday } }, _sum: { grandTotal: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { shopId, status: 'COMPLETED', createdAt: { gte: startOfWeek } }, _sum: { grandTotal: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { shopId, status: 'COMPLETED', createdAt: { gte: startOfMonth } }, _sum: { grandTotal: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { shopId, status: 'COMPLETED' }, _sum: { grandTotal: true }, _count: { id: true } }),

    // Orders by status
    prisma.order.groupBy({ by: ['status'], where: { shopId }, _count: { id: true } }),

    // Top products by revenue (via order items)
    prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      where: { order: { shopId, status: 'COMPLETED' } },
      _sum: { lineTotal: true, qty: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 8,
    }),

    // Top products by views
    prisma.product.findMany({
      where: { shopId, isActive: true },
      orderBy: { views: 'desc' },
      take: 8,
      select: { id: true, name: true, views: true, salesCount: true, price: true },
    }),

    // Customer analytics
    prisma.customer.count({ where: { shopId } }),
    prisma.customer.count({ where: { shopId, createdAt: { gte: start30 } } }),

    // Daily revenue last 30 days (raw query)
    prisma.$queryRaw<{ day: string; revenue: number; orders: number }[]>`
      SELECT
        DATE(created_at) as day,
        SUM(CAST(grand_total AS FLOAT)) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE shop_id = ${shopId}
        AND status = 'COMPLETED'
        AND created_at >= ${start30}
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `,

    // Recent 5 completed orders
    prisma.order.findMany({
      where: { shopId, status: 'COMPLETED', createdAt: { gte: start7 } },
      orderBy: { deliveredAt: 'desc' },
      take: 5,
      select: { orderNumber: true, grandTotal: true, currency: true, deliveredAt: true, customerName: true },
    }),
  ])

  // Commission
  const commissionSetting = await prisma.setting.findUnique({ where: { key: 'platform.commission.sales' } })
  let commissionRate = 0, commissionType = 'percentage'
  if (commissionSetting?.value) {
    try {
      const c = JSON.parse(commissionSetting.value as string)
      commissionType = c.type ?? 'percentage'
      commissionRate = Number(c.value ?? 0)
    } catch { /* */ }
  }

  const totalRev = Number(allTimeAgg._sum.grandTotal ?? 0)
  const commission = commissionType === 'percentage'
    ? totalRev * (commissionRate / 100)
    : allTimeAgg._count.id * commissionRate

  const statusMap: Record<string, number> = {}
  for (const row of statusCounts) statusMap[row.status] = row._count.id

  return NextResponse.json({
    revenue: {
      today: Number(todayAgg._sum.grandTotal ?? 0),
      todayOrders: todayAgg._count.id,
      week: Number(weekAgg._sum.grandTotal ?? 0),
      weekOrders: weekAgg._count.id,
      month: Number(monthAgg._sum.grandTotal ?? 0),
      monthOrders: monthAgg._count.id,
      allTime: totalRev,
      allTimeOrders: allTimeAgg._count.id,
      commission,
      net: totalRev - commission,
    },
    orders: {
      byStatus: statusMap,
      pending: (statusMap['PENDING'] ?? 0) + (statusMap['CONFIRMED'] ?? 0) + (statusMap['PREPARED'] ?? 0) + (statusMap['IN_DELIVERY'] ?? 0),
      completed: statusMap['COMPLETED'] ?? 0,
      cancelled: statusMap['CANCELLED'] ?? 0,
    },
    topProducts: topProductsRev.map(r => ({
      productId: r.productId,
      name: r.name,
      revenue: Number(r._sum.lineTotal ?? 0),
      qty: Number(r._sum.qty ?? 0),
    })),
    topByViews: topProductsViews,
    customers: { total: customerCount, newThisMonth: newCustomers },
    daily: daily30.map(r => ({ day: String(r.day), revenue: Number(r.revenue), orders: Number(r.orders) })),
    recentSales: recentCompleted,
  })
}
