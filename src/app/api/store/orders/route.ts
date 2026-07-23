import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, rlKey, tooManyRequests } from '@/lib/rate-limit'
import { sendMail, orderConfirmationHtml } from '@/lib/mailer'
import { getSetting } from '@/lib/services/settings.service'
import { formatCurrency } from '@/lib/utils'

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
      name: product.name,
      sku: product.sku,
      qty: item.qty,
      unitPrice,
      lineTotal: unitPrice * item.qty,
    })
  }

  const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0)

  // Generate order number: ORD-YYYYMMDD-XXXX
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: `ORD-${ymd}` } },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  })
  const seq = last
    ? Number(last.orderNumber.split('-')[2] ?? '0') + 1
    : 1
  const orderNumber = `ORD-${ymd}-${String(seq).padStart(4, '0')}`

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName,
      customerEmail: customerEmail || null,
      shippingAddress,
      paymentMethod,
      notes,
      subtotal,
      grandTotal: subtotal,
      lineItems: {
        create: lineItems.map((l, idx) => ({
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

  // Link customer to order
  await prisma.order.update({
    where: { id: order.id },
    data: { customerId: customer.id },
  })

  // Send order confirmation email (non-blocking — fire and forget)
  if (customerEmail) {
    const companyName = (await getSetting('company.name')) ?? 'Portal'
    const currency = (await getSetting('currency.base')) ?? 'BHD'
    sendMail({
      to: customerEmail,
      subject: `Order Confirmed — ${orderNumber}`,
      html: orderConfirmationHtml({
        companyName,
        orderNumber,
        customerName,
        items: lineItems.map((l) => ({
          name: l.name,
          qty: l.qty,
          price: formatCurrency(l.lineTotal, currency),
        })),
        total: formatCurrency(subtotal, currency),
        currency,
      }),
    })
  }

  return NextResponse.json(order, { status: 201 })
}
