import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const expenseSchema = z.object({
  category: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  amount: z.number().positive(),
  currency: z.string().default('BHD'),
  expenseDate: z.string(),
  recurrence: z.enum(['ONCE', 'MONTHLY', 'YEARLY']).default('ONCE'),
  vendor: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  const expenses = await prisma.expense.findMany({
    where: {
      ...(from ? { expenseDate: { gte: new Date(from) } } : {}),
      ...(to ? { expenseDate: { lte: new Date(to) } } : {}),
    },
    orderBy: { expenseDate: 'desc' },
    take: 200,
  })

  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = expenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const expense = await prisma.expense.create({
    data: {
      category: d.category,
      description: d.description,
      amount: d.amount,
      amountBase: d.amount, // in BHD; multi-currency conversion not yet implemented
      currency: d.currency,
      expenseDate: new Date(d.expenseDate),
      recurrence: d.recurrence,
      vendor: d.vendor,
      notes: d.notes,
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
