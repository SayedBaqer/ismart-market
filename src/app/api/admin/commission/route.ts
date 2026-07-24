import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const shopId = url.searchParams.get('shopId')
  const period = url.searchParams.get('period') ?? 'all' // all | month | week

  const now = new Date()
  let dateFilter: { gte?: Date } = {}
  if (period === 'month') dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
  if (period === 'week') { const s = new Date(now); s.setDate(now.getDate() - 7); dateFilter = { gte: s } }

  const commissionSetting = await prisma.setting.findUnique({ where: { key: 'platform.commission' } })
  let salesType = 'percentage', salesValue = 0, deliveryType = 'percentage', deliveryValue = 0
  if (commissionSetting?.value) {
    try {
      const c = typeof commissionSetting.value === 'string' ? JSON.parse(commissionSetting.value) : commissionSetting.value as Record<string, unknown>
      salesType = (c.salesType as string) ?? 'percentage'
      salesValue = Number(c.salesValue ?? 0)
      deliveryType = (c.deliveryType as string) ?? 'percentage'
      deliveryValue = Number(c.deliveryValue ?? 0)
    } catch { /* */ }
  }

  // Aggregate per shop
  const where = {
    status: 'COMPLETED' as const,
    ...(shopId ? { shopId } : {}),
    ...(dateFilter.gte ? { createdAt: dateFilter } : {}),
  }

  const shopAgg = await prisma.order.groupBy({
    by: ['shopId'],
    where,
    _sum: { grandTotal: true, shippingTotal: true },
    _count: { id: true },
  })

  const shopIds = shopAgg.map(r => r.shopId).filter(Boolean) as string[]
  const shops = await prisma.shop.findMany({
    where: { id: { in: shopIds } },
    select: { id: true, name: true, slug: true, logoUrl: true, plan: true },
  })
  const shopMap = Object.fromEntries(shops.map(s => [s.id, s]))

  // Read paid commissions from settings (stored as JSON)
  const paidSetting = await prisma.setting.findUnique({ where: { key: 'commission.paid' } })
  let paidMap: Record<string, { amount: number; paidAt: string; note?: string }[]> = {}
  if (paidSetting?.value) {
    try {
      paidMap = typeof paidSetting.value === 'string' ? JSON.parse(paidSetting.value) : paidSetting.value as typeof paidMap
    } catch { /* */ }
  }

  const rows = shopAgg.map(agg => {
    const shopId = agg.shopId ?? ''
    const shop = shopMap[shopId]
    const revenue = Number(agg._sum.grandTotal ?? 0)
    const shipping = Number(agg._sum.shippingTotal ?? 0)
    const orderCount = agg._count.id

    const salesCommission = salesType === 'percentage'
      ? revenue * (salesValue / 100)
      : orderCount * salesValue

    const deliveryCommission = deliveryType === 'percentage'
      ? shipping * (deliveryValue / 100)
      : orderCount * deliveryValue

    const totalOwed = salesCommission + deliveryCommission
    const payments = paidMap[shopId] ?? []
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
    const balance = totalOwed - totalPaid

    return {
      shopId,
      shopName: shop?.name ?? shopId,
      shopSlug: shop?.slug,
      plan: shop?.plan ?? 'FREE',
      revenue,
      shipping,
      orderCount,
      salesCommission,
      deliveryCommission,
      totalOwed,
      totalPaid,
      balance,
      payments,
    }
  })

  rows.sort((a, b) => b.balance - a.balance)

  const totals = {
    totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    totalOwed: rows.reduce((s, r) => s + r.totalOwed, 0),
    totalPaid: rows.reduce((s, r) => s + r.totalPaid, 0),
    totalBalance: rows.reduce((s, r) => s + r.balance, 0),
    salesRate: `${salesValue}${salesType === 'percentage' ? '%' : ' BHD/order'}`,
    deliveryRate: `${deliveryValue}${deliveryType === 'percentage' ? '%' : ' BHD/order'}`,
  }

  return NextResponse.json({ rows, totals })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { shopId, amount, note } = body as { shopId: string; amount: number; note?: string }

  const paidSetting = await prisma.setting.findUnique({ where: { key: 'commission.paid' } })
  let paidMap: Record<string, { amount: number; paidAt: string; note?: string }[]> = {}
  if (paidSetting?.value) {
    try {
      paidMap = typeof paidSetting.value === 'string' ? JSON.parse(paidSetting.value) : paidSetting.value as typeof paidMap
    } catch { /* */ }
  }

  if (!paidMap[shopId]) paidMap[shopId] = []
  paidMap[shopId].push({ amount: Number(amount), paidAt: new Date().toISOString(), note })

  await prisma.setting.upsert({
    where: { key: 'commission.paid' },
    update: { value: JSON.stringify(paidMap) },
    create: { key: 'commission.paid', value: JSON.stringify(paidMap) },
  })

  return NextResponse.json({ ok: true })
}
