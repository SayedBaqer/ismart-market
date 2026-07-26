import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      customer: true,
      // Explicit select — never return unitCostSnapshot (shop owner's private cost data) to admin
      items: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, documentId: true, productId: true, variationId: true, name: true, sku: true,
          description: true, qty: true, unitPrice: true, discountPct: true, taxPct: true,
          lineTotal: true, serial: true, warranty: true, sortOrder: true,
        },
      },
      payments: { orderBy: { paidAt: 'asc' } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(doc)
}

const patchSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled']).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  dueDate: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const data = parsed.data
  const doc = await prisma.document.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.terms !== undefined && { terms: data.terms }),
      ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
    },
    select: { id: true, status: true, docNumber: true },
  })

  return NextResponse.json(doc)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.document.findUnique({ where: { id }, select: { status: true } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft documents can be deleted' }, { status: 400 })
  }

  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
