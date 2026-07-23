import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['cash', 'bank', 'card', 'other']).default('cash'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, grandTotal: true, amountPaid: true },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const payment = await prisma.payment.create({
    data: {
      documentId: id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
    },
  })

  // Update amountPaid and auto-set status
  const newAmountPaid = Number(doc.amountPaid) + parsed.data.amount
  const grandTotal = Number(doc.grandTotal)
  const newStatus =
    newAmountPaid >= grandTotal ? 'paid' :
    newAmountPaid > 0 ? 'partial' :
    undefined

  await prisma.document.update({
    where: { id },
    data: {
      amountPaid: newAmountPaid,
      ...(newStatus ? { status: newStatus } : {}),
    },
  })

  return NextResponse.json(payment, { status: 201 })
}
