import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getProvider } from '@/lib/db-compat'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const range = req.nextUrl.searchParams.get('range') ?? '30'
  const days = Math.min(365, Math.max(1, parseInt(range) || 30))

  const since = new Date()
  since.setDate(since.getDate() - days)

  const isMySQL = getProvider() === 'mysql'

  try {
  const [orders, ordersByDay, topProducts, categoryRevenue, newCustomers] = await Promise.all([
    // Summary totals
    prisma.order.aggregate({
      where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      _count: true,
      _sum: { grandTotal: true },
    }),

    // Orders grouped by day — SQL differs between providers
    isMySQL
      ? prisma.$queryRaw<Array<{ day: string; count: bigint; revenue: string }>>`
          SELECT
            DATE_FORMAT(createdAt, '%Y-%m-%d') AS day,
            COUNT(*) AS count,
            SUM(grandTotal) AS revenue
          FROM orders
          WHERE createdAt >= ${since}
            AND status != 'CANCELLED'
          GROUP BY day
          ORDER BY day
        `
      : prisma.$queryRaw<Array<{ day: string; count: bigint; revenue: string }>>`
          SELECT
            TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS day,
            COUNT(*) AS count,
            SUM("grandTotal") AS revenue
          FROM orders
          WHERE "createdAt" >= ${since}
            AND status != 'CANCELLED'
          GROUP BY 1
          ORDER BY 1
        `,

    // Top 10 products by revenue (Prisma ORM — works with both providers)
    prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      where: { order: { createdAt: { gte: since }, status: { not: 'CANCELLED' } } },
      _sum: { lineTotal: true, qty: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 10,
    }),

    // Revenue by category — SQL differs between providers
    isMySQL
      ? prisma.$queryRaw<Array<{ category: string; revenue: string }>>`
          SELECT
            COALESCE(c.name, 'Uncategorized') AS category,
            SUM(oi.lineTotal) AS revenue
          FROM order_items oi
          JOIN orders o ON o.id = oi.orderId
          LEFT JOIN products p ON p.id = oi.productId
          LEFT JOIN categories c ON c.id = p.categoryId
          WHERE o.createdAt >= ${since}
            AND o.status != 'CANCELLED'
          GROUP BY category
          ORDER BY revenue DESC
          LIMIT 8
        `
      : prisma.$queryRaw<Array<{ category: string; revenue: string }>>`
          SELECT
            COALESCE(c.name, 'Uncategorized') AS category,
            SUM(oi."lineTotal") AS revenue
          FROM order_items oi
          JOIN orders o ON o.id = oi."orderId"
          LEFT JOIN products p ON p.id = oi."productId"
          LEFT JOIN categories c ON c.id = p."categoryId"
          WHERE o."createdAt" >= ${since}
            AND o.status != 'CANCELLED'
          GROUP BY 1
          ORDER BY 2 DESC
          LIMIT 8
        `,

    // New customers
    prisma.customer.count({ where: { createdAt: { gte: since } } }),
  ])

  return NextResponse.json({
    summary: {
      orderCount: orders._count,
      revenue: Number(orders._sum.grandTotal ?? 0),
      newCustomers,
    },
    ordersByDay: ordersByDay.map((r) => ({
      day: r.day,
      count: Number(r.count),
      revenue: parseFloat(r.revenue ?? '0'),
    })),
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: p.name,
      revenue: Number(p._sum.lineTotal ?? 0),
      qty: Number(p._sum.qty ?? 0),
    })),
    categoryRevenue: categoryRevenue.map((r) => ({
      category: r.category,
      revenue: parseFloat(r.revenue ?? '0'),
    })),
  })
  } catch (err) {
    console.error('reports GET error', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
