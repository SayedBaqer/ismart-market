import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'
import { z } from 'zod'

const createSchema = z.object({
  displayName: z.string().min(1).max(100),
  mobile: z.string().min(1).max(30),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  billingAddress: z.string().max(500).optional(),
  taxNumber: z.string().max(50).optional(),
  isSupplier: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  currency: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const PAGE = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') ?? '25')))

  const where = q
    ? {
        OR: [
          { displayName: { contains: q, ...ci() } },
          { mobile: { contains: q } },
          { email: { contains: q, ...ci() } },
        ],
      }
    : {}

  try {
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: PAGE,
        skip: (page - 1) * PAGE,
        orderBy: { displayName: 'asc' },
        include: { _count: { select: { orders: true, documents: true } } },
      }),
      prisma.customer.count({ where }),
    ])
    return NextResponse.json({ customers, total, pages: Math.ceil(total / PAGE), page })
  } catch (err) {
    console.error('customers GET error', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const data = parsed.data
    const customer = await prisma.customer.create({
      data: {
        displayName: data.displayName,
        mobile: data.mobile,
        email: data.email || undefined,
        phone: data.phone || undefined,
        billingAddress: data.billingAddress || undefined,
        taxNumber: data.taxNumber || undefined,
        isSupplier: data.isSupplier ?? false,
        notes: data.notes || undefined,
        currency: data.currency ?? 'BHD',
      },
    })
    return NextResponse.json(customer, { status: 201 })
  } catch (err) {
    console.error('customer POST error', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
