import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  plan: z.enum(['FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE']).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  paymentStatus: z.enum(['PAID', 'UNPAID', 'GRACE', 'SUSPENDED']).optional(),
  paymentDueDate: z.string().optional().nullable(),
  paymentNote: z.string().max(500).optional(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [shop, revenueData] = await Promise.all([
    prisma.shop.findUnique({
      where: { id },
      include: {
        users: { include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } } },
        _count: { select: { products: true, orders: true, customers: true, users: true } },
      },
    }),
    prisma.order.aggregate({
      where: { shopId: id, status: 'COMPLETED' },
      _sum: { grandTotal: true },
    }),
  ])

  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ shop: { ...shop, revenue: Number(revenueData._sum.grandTotal ?? 0) } })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { paymentDueDate, ...rest } = parsed.data

  const shop = await prisma.shop.update({
    where: { id },
    data: {
      ...rest,
      ...(paymentDueDate !== undefined && { paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null }),
    },
  })

  return NextResponse.json(shop)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const hard = req.nextUrl.searchParams.get('mode') === 'hard'

  if (!hard) {
    await prisma.shop.update({ where: { id }, data: { status: 'CLOSED' } })
    return NextResponse.json({ ok: true })
  }

  // Hard delete: detach (not delete) financial/history records so revenue and order
  // history survive as unowned rows, then remove the shop and its owned junction data.
  await prisma.$transaction([
    prisma.product.updateMany({ where: { shopId: id }, data: { shopId: null } }),
    prisma.order.updateMany({ where: { shopId: id }, data: { shopId: null } }),
    prisma.customer.updateMany({ where: { shopId: id }, data: { shopId: null } }),
    prisma.document.updateMany({ where: { shopId: id }, data: { shopId: null } }),
    prisma.category.updateMany({ where: { shopId: id }, data: { shopId: null } }),
    prisma.shopUser.deleteMany({ where: { shopId: id } }),
    prisma.shopBranch.deleteMany({ where: { shopId: id } }),
    prisma.shopNews.deleteMany({ where: { shopId: id } }),
    prisma.shop.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true, deleted: true })
}
