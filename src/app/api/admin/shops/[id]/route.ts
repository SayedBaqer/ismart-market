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
})

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [shop, revenueData] = await Promise.all([
    prisma.shop.findUnique({
      where: { id },
      include: {
        users: { include: { user: { select: { name: true, email: true, role: true } } } },
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

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const shop = await prisma.shop.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(shop)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.shop.update({ where: { id }, data: { status: 'CLOSED' } })
  return NextResponse.json({ ok: true })
}
