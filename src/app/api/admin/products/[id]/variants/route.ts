import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const variantSchema = z.object({
  sku: z.string().min(1).max(100),
  attributes: z.record(z.string()),
  price: z.number().min(0),
  stockQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const variants = await prisma.productVariant.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(variants)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = variantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { sku, attributes, price, stockQty, isActive } = parsed.data

  const existing = await prisma.productVariant.findUnique({ where: { sku } })
  if (existing) {
    return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId: id,
      sku,
      attributes,
      price,
      stockQty: stockQty ?? 0,
      isActive: isActive ?? true,
    },
  })

  return NextResponse.json(variant, { status: 201 })
}
