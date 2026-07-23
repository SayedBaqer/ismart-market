import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  mobile: z.string().min(1).max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  billingAddress: z.string().max(500).optional(),
  taxNumber: z.string().max(50).optional(),
  isSupplier: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  currency: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          currency: true,
          createdAt: true,
        },
      },
      documents: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          docType: true,
          docNumber: true,
          status: true,
          grandTotal: true,
          currency: true,
          issueDate: true,
        },
      },
      _count: { select: { orders: true, documents: true } },
    },
  })

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(customer)
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

  const data = parsed.data
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.mobile && { mobile: data.mobile }),
      email: data.email !== undefined ? (data.email || null) : undefined,
      phone: data.phone !== undefined ? (data.phone || null) : undefined,
      billingAddress: data.billingAddress !== undefined ? (data.billingAddress || null) : undefined,
      taxNumber: data.taxNumber !== undefined ? (data.taxNumber || null) : undefined,
      isSupplier: data.isSupplier !== undefined ? data.isSupplier : undefined,
      notes: data.notes !== undefined ? (data.notes || null) : undefined,
      currency: data.currency,
    },
  })

  return NextResponse.json(customer)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [orderCount, docCount] = await Promise.all([
    prisma.order.count({ where: { customerId: id } }),
    prisma.document.count({ where: { customerId: id } }),
  ])

  if (orderCount > 0 || docCount > 0) {
    return NextResponse.json(
      { error: 'Cannot delete customer with existing orders or documents' },
      { status: 409 },
    )
  }

  await prisma.customer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
