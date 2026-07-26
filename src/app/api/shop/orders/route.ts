import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getEffectiveFeatureLimits, getEffectivePlan } from '@/lib/plan-limits'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') // filter by OrderStatus
  const search = url.searchParams.get('q')?.trim()
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = 25

  const where = {
    shopId: shopUser.shopId,
    ...(status && status !== 'ALL' ? { status: status as never } : {}),
    ...(search ? {
      OR: [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerEmail: { contains: search } },
      ],
    } : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { displayName: true, mobile: true } },
        lineItems: { select: { name: true, qty: true, unitPrice: true, lineTotal: true }, take: 3 },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json({ orders, total, pages: Math.ceil(total / limit), page })
}

const saleItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1).max(200),
  sku: z.string().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
})

const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().max(100).optional(),
  customerMobile: z.string().max(30).optional(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'cash_on_delivery']).default('cash'),
  notes: z.string().max(500).optional(),
  items: z.array(saleItemSchema).min(1),
})

async function nextOrderNumber(ymd: string) {
  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: `ORD-${ymd}` } },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  })
  const seq = last ? Number(last.orderNumber.split('-')[2] ?? '0') + 1 : 1
  return `ORD-${ymd}-${String(seq).padStart(4, '0')}`
}

// Shop staff creating a walk-in / in-person sale directly (not via storefront checkout).
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id }, include: { shop: true } })
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = saleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { customerId, customerName, customerMobile, paymentMethod, notes, items } = parsed.data

  const shop = shopUser.shop
  const effectivePlan = getEffectivePlan(shop.plan, shop.paymentStatus)
  const limits = await getEffectiveFeatureLimits(effectivePlan, shop.settings)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [ordersToday, ordersThisMonth] = await Promise.all([
    prisma.order.count({ where: { shopId: shop.id, createdAt: { gte: startOfDay } } }),
    prisma.order.count({ where: { shopId: shop.id, createdAt: { gte: startOfMonth } } }),
  ])
  if (ordersToday >= limits.ordersPerDay) {
    return NextResponse.json({ error: `Daily order limit reached (${limits.ordersPerDay}/day) on your current plan.`, code: 'SHOP_ORDER_LIMIT' }, { status: 429 })
  }
  if (ordersThisMonth >= limits.ordersPerMonth) {
    return NextResponse.json({ error: `Monthly order limit reached (${limits.ordersPerMonth}) on your current plan.`, code: 'SHOP_ORDER_LIMIT' }, { status: 429 })
  }

  let customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null
  if (customer && customer.shopId && customer.shopId !== shop.id) customer = null

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const orderNumber = await nextOrderNumber(ymd)

  const order = await prisma.order.create({
    data: {
      orderNumber,
      shopId: shop.id,
      status: 'CONFIRMED',
      confirmedAt: now,
      customerId: customer?.id,
      customerName: customer?.displayName ?? customerName ?? null,
      paymentMethod,
      notes,
      subtotal,
      grandTotal: subtotal,
      createdById: session.user.id,
      lineItems: {
        create: items.map((i, idx) => ({
          productId: i.productId,
          name: i.name,
          sku: i.sku,
          qty: i.qty,
          unitPrice: i.unitPrice,
          lineTotal: i.qty * i.unitPrice,
          sortOrder: idx,
        })),
      },
    },
    select: { id: true, orderNumber: true },
  })

  if (!customer && (customerName || customerMobile)) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        customer: {
          create: {
            shopId: shop.id,
            displayName: customerName || 'Walk-in customer',
            mobile: customerMobile || 'N/A',
          },
        },
      },
    })
  }

  return NextResponse.json({ order }, { status: 201 })
}
