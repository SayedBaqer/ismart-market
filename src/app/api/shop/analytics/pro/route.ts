import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { isPluginEnabledForShop } from '@/lib/services/plugin.service'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({
    where: { userId: session.user.id },
    select: { shopId: true },
  })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  if (!(await isPluginEnabledForShop(shopUser.shopId, 'statistics-pro'))) {
    return NextResponse.json({ error: 'Pro Statistics plugin is not enabled for your shop', code: 'PLUGIN_DISABLED' }, { status: 403 })
  }

  const shopId = shopUser.shopId
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [orders, categoryAgg, products] = await Promise.all([
    prisma.order.findMany({
      where: { shopId, createdAt: { gte: since30 } },
      select: { createdAt: true, grandTotal: true, customerId: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { shopId, createdAt: { gte: since30 } } },
      _sum: { qty: true, lineTotal: true },
    }),
    prisma.product.findMany({
      where: { shopId, trackStock: true, isActive: true },
      select: { id: true, name: true, sku: true, stockMeta: { select: { currentQty: true } } },
    }),
  ])

  // Sales trend by day (last 30 days)
  const dayMap = new Map<string, { revenue: number; orders: number }>()
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10)
    const entry = dayMap.get(key) ?? { revenue: 0, orders: 0 }
    entry.revenue += Number(o.grandTotal)
    entry.orders += 1
    dayMap.set(key, entry)
  }
  const trend = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day: day.slice(5), revenue: Math.round(v.revenue * 1000) / 1000, orders: v.orders }))

  // Repeat customer rate
  const customerOrderCounts = new Map<string, number>()
  for (const o of orders) {
    if (!o.customerId) continue
    customerOrderCounts.set(o.customerId, (customerOrderCounts.get(o.customerId) ?? 0) + 1)
  }
  const totalCustomers = customerOrderCounts.size
  const repeatCustomers = [...customerOrderCounts.values()].filter((c) => c > 1).length
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0

  // Top categories by revenue (via product -> category)
  const productIds = categoryAgg.map((c) => c.productId).filter(Boolean) as string[]
  const productCats = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, category: { select: { name: true } } },
  })
  const catNameByProduct = new Map(productCats.map((p) => [p.id, p.category?.name ?? 'Uncategorized']))
  const catRevenue = new Map<string, number>()
  for (const c of categoryAgg) {
    if (!c.productId) continue
    const name = catNameByProduct.get(c.productId) ?? 'Uncategorized'
    catRevenue.set(name, (catRevenue.get(name) ?? 0) + Number(c._sum.lineTotal ?? 0))
  }
  const topCategories = [...catRevenue.entries()]
    .map(([category, revenue]) => ({ category, revenue: Math.round(revenue * 1000) / 1000 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  // Low-stock forecast: avg daily consumption over 30d vs current qty
  const qtyByProduct = new Map(categoryAgg.map((c) => [c.productId, Number(c._sum.qty ?? 0)]))
  const forecast = products
    .map((p) => {
      const soldLast30 = qtyByProduct.get(p.id) ?? 0
      const dailyRate = soldLast30 / 30
      const currentQty = p.stockMeta?.currentQty ?? 0
      const daysLeft = dailyRate > 0 ? currentQty / dailyRate : Infinity
      return { id: p.id, name: p.name, sku: p.sku, currentQty, dailyRate: Math.round(dailyRate * 100) / 100, daysLeft }
    })
    .filter((p) => p.dailyRate > 0 && p.daysLeft < 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8)
    .map((p) => ({ ...p, daysLeft: Math.round(p.daysLeft) }))

  return NextResponse.json({
    trend,
    repeatRate,
    totalCustomers,
    repeatCustomers,
    topCategories,
    forecast,
  })
}
