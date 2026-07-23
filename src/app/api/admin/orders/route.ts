import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    ...(q && {
      OR: [
        { orderNumber: { contains: q, ...ci() } },
        { customerName: { contains: q, ...ci() } },
        { customerEmail: { contains: q, ...ci() } },
      ],
    }),
    ...(status && { status: status as never }),
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      take: PAGE_SIZE,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, displayName: true } },
        lineItems: { select: { id: true } },
      },
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json({
    orders: orders.map((o: typeof orders[number]) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customerName: o.customerName ?? o.customer?.displayName ?? 'Guest',
      customerEmail: o.customerEmail,
      grandTotal: Number(o.grandTotal),
      currency: o.currency,
      itemCount: o.lineItems.length,
      createdAt: o.createdAt.toISOString(),
    })),
    total,
    pages: Math.ceil(total / PAGE_SIZE),
    page,
  })
}
