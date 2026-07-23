import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

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
