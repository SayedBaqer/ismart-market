import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  currency: z.string().default('BHD'),
  language: z.string().default('en'),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const PAGE = 25

  const where = {
    ...(status && { status: status as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED' }),
    ...(q && {
      OR: [
        { name: { contains: q, ...ci() } },
        { slug: { contains: q } },
        { email: { contains: q, ...ci() } },
      ],
    }),
  }

  const [shops, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      take: PAGE,
      skip: (page - 1) * PAGE,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { products: true, orders: true, users: true } },
      },
    }),
    prisma.shop.count({ where }),
  ])

  return NextResponse.json({ shops, total, pages: Math.ceil(total / PAGE), page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { slug } = parsed.data
  const existing = await prisma.shop.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }

  const shop = await prisma.shop.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || undefined,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      address: parsed.data.address || undefined,
      currency: parsed.data.currency,
      language: parsed.data.language,
      status: 'ACTIVE', // admin-created shops are immediately active
    },
  })

  return NextResponse.json(shop, { status: 201 })
}
