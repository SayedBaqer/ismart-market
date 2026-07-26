import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED']).optional(),
  notes: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      // Explicit select — never return unitCostSnapshot (shop owner's private cost data) to admin
      lineItems: {
        select: {
          id: true, orderId: true, productId: true, name: true, sku: true, qty: true,
          unitPrice: true, discountPct: true, taxPct: true, lineTotal: true, sortOrder: true,
          product: { select: { id: true, slug: true, images: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const order = await prisma.order.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(order)
}
