import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, rlKey, tooManyRequests } from '@/lib/rate-limit'
import { sendMail, orderConfirmationHtml } from '@/lib/mailer'
import { getSetting } from '@/lib/services/settings.service'
import { formatCurrency } from '@/lib/utils'
import { getEffectiveFeatureLimits } from '@/lib/plan-limits'

const itemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
})

const orderSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().min(5).max(30),
  shippingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().optional(),
    area: z.string().optional(),
    block: z.string().optional(),
    building: z.string().optional(),
    flat: z.string().optional(),
  }),
  paymentMethod: z.enum(['cash_on_delivery', 'bank_transfer', 'card']).default('cash_on_delivery'),
  notes: z.string().max(500).optional(),
  items: z.array(itemSchema).min(1),
})

async function nextOrderNumber(ymd: string, taken: Set<string>) {
  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: `ORD-${ymd}` } },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  })
  let seq = last ? Number(last.orderNumber.split('-')[2] ?? '0') + 1 : 1
  let orderNumber = `ORD-${ymd}-${String(seq).padStart(4, '0')}`
  while (taken.has(orderNumber)) {
    seq += 1
    orderNumber = `ORD-${ymd}-${String(seq).padStart(4, '0')}`
  }
  taken.add(orderNumber)
  return orderNumber
}

export async function POST(req: NextRequest) {
  // 20 orders per hour per IP — prevents checkout spam
  const rl = rateLimit(rlKey(req, 'store:orders'), { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return tooManyRequests(rl.resetAt)

  const body = await req.json()
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, notes, items } = parsed.data

  // Fetch products and prices from DB (never trust client prices)
  const productIds = items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { stockMeta: { select: { currentQty: true } } },
  })

  const productMap = new Map(products.map((p) => [p.id, p]))
  const lineItems: Array<{
    productId: string
    shopId: string | null
    name: string
    sku: string
    qty: number
    unitPrice: number
    lineTotal: number
  }> = []

  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 })
    }
    if (product.trackStock && (product.stockMeta?.currentQty ?? 0) < item.qty) {
      return NextResponse.json({ error: `"${product.name}" is out of stock` }, { status: 409 })
    }
    const unitPrice = Number(product.price)
    lineItems.push({
      productId: product.id,
      shopId: product.shopId,
      name: product.name,
      sku: product.sku,
      qty: item.qty,
      unitPrice,
      lineTotal: unitPrice * item.qty,
    })
  }

  // A cart can span multiple shops (marketplace-wide cart) — split into one Order per shop
  // so each shop's line items, totals and order-volume limits stay correctly scoped.
  const groups = new Map<string | null, typeof lineItems>()
  for (const li of lineItems) {
    const key = li.shopId
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(li)
  }

  // Pre-check FREE-plan (and other plan) order-volume limits for every shop before creating anything,
  // so a checkout either fully succeeds or fails with a clear reason — no partial orders.
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  for (const shopId of groups.keys()) {
    if (!shopId) continue
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true, plan: true, settings: true, paymentStatus: true } })
    if (!shop) continue

    if (shop.paymentStatus === 'SUSPENDED') {
      return NextResponse.json({
        error: `"${shop.name}" is temporarily unable to accept orders. Please contact support.`,
        code: 'SHOP_SUSPENDED',
      }, { status: 403 })
    }

    const limits = await getEffectiveFeatureLimits(shop.plan, shop.settings)
    const [ordersToday, ordersThisMonth] = await Promise.all([
      prisma.order.count({ where: { shopId, createdAt: { gte: startOfDay } } }),
      prisma.order.count({ where: { shopId, createdAt: { gte: startOfMonth } } }),
    ])
    if (ordersToday >= limits.ordersPerDay) {
      return NextResponse.json({
        error: `"${shop.name}" has reached its daily order limit (${limits.ordersPerDay}/day). Please try again tomorrow.`,
        code: 'SHOP_ORDER_LIMIT',
      }, { status: 429 })
    }
    if (ordersThisMonth >= limits.ordersPerMonth) {
      return NextResponse.json({
        error: `"${shop.name}" has reached its monthly order limit (${limits.ordersPerMonth}). Please try again next month.`,
        code: 'SHOP_ORDER_LIMIT',
      }, { status: 429 })
    }
  }

  // Generate order number(s): ORD-YYYYMMDD-XXXX
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const takenNumbers = new Set<string>()

  const createdOrders: { id: string; orderNumber: string; grandTotal: number }[] = []
  const allLineItemsForEmail: Array<{ name: string; qty: number; lineTotal: number }> = []

  for (const [shopId, groupItems] of groups) {
    const orderNumber = await nextOrderNumber(ymd, takenNumbers)
    const subtotal = groupItems.reduce((s, l) => s + l.lineTotal, 0)

    const order = await prisma.order.create({
      data: {
        orderNumber,
        shopId: shopId ?? undefined,
        customerName,
        customerEmail: customerEmail || null,
        shippingAddress,
        paymentMethod,
        notes,
        subtotal,
        grandTotal: subtotal,
        lineItems: {
          create: groupItems.map((l, idx) => ({
            productId: l.productId,
            name: l.name,
            sku: l.sku,
            qty: l.qty,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
            sortOrder: idx,
          })),
        },
      },
      select: { id: true, orderNumber: true, grandTotal: true },
    })

    createdOrders.push({ id: order.id, orderNumber: order.orderNumber, grandTotal: Number(order.grandTotal) })
    for (const l of groupItems) allLineItemsForEmail.push({ name: l.name, qty: l.qty, lineTotal: l.lineTotal })
  }

  // Link phone to customer record (find or create by phone)
  let customer = await prisma.customer.findFirst({ where: { mobile: customerPhone } })
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        displayName: customerName,
        mobile: customerPhone,
        email: customerEmail || null,
      },
    })
  } else {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        displayName: customerName,
        ...(customerEmail ? { email: customerEmail } : {}),
      },
    })
  }

  // Link customer to all created orders
  await prisma.order.updateMany({
    where: { id: { in: createdOrders.map((o) => o.id) } },
    data: { customerId: customer.id },
  })

  const grandTotal = createdOrders.reduce((s, o) => s + o.grandTotal, 0)

  // Send order confirmation email (non-blocking — fire and forget)
  if (customerEmail) {
    const companyName = (await getSetting('company.name')) ?? 'Portal'
    const currency = (await getSetting('currency.base')) ?? 'BHD'
    sendMail({
      to: customerEmail,
      subject: `Order Confirmed — ${createdOrders.map((o) => o.orderNumber).join(', ')}`,
      html: orderConfirmationHtml({
        companyName,
        orderNumber: createdOrders.map((o) => o.orderNumber).join(', '),
        customerName,
        items: allLineItemsForEmail.map((l) => ({
          name: l.name,
          qty: l.qty,
          price: formatCurrency(l.lineTotal, currency),
        })),
        total: formatCurrency(grandTotal, currency),
        currency,
      }),
    })
  }

  return NextResponse.json({
    orderNumber: createdOrders.map((o) => o.orderNumber).join(', '),
    grandTotal,
    orders: createdOrders,
  }, { status: 201 })
}
