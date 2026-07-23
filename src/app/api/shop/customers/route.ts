import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  displayName: z.string().min(1).max(100),
  mobile: z.string().min(1).max(30),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  billingAddress: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'))
  const limit = 25

  const where = {
    shopId: shopUser.shopId,
    ...(q ? { OR: [
      { displayName: { contains: q } },
      { mobile: { contains: q } },
      { email: { contains: q } },
    ]} : {}),
  }

  try {
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { orders: true } } },
      }),
      prisma.customer.count({ where }),
    ])
    return NextResponse.json({ customers, total, pages: Math.ceil(total / limit) })
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { displayName, mobile, email, phone, billingAddress, notes } = parsed.data
  const customer = await prisma.customer.create({
    data: {
      shopId: shopUser.shopId,
      displayName,
      mobile,
      email: email || null,
      phone: phone || null,
      billingAddress: billingAddress || null,
      notes: notes || null,
    },
  })
  return NextResponse.json({ customer }, { status: 201 })
}
