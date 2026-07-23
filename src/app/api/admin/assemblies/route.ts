import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  productId: z.string(),
  extraCharge: z.number().min(0).default(0),
  notes: z.string().optional(),
  components: z.array(z.object({
    productId: z.string(),
    qty: z.number().positive(),
    sortOrder: z.number().optional(),
  })).min(1),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assemblies = await prisma.assembly.findMany({
    include: {
      product: { select: { id: true, name: true, sku: true, price: true } },
      components: {
        include: {
          product: { select: { id: true, name: true, sku: true, price: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(assemblies)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  // Calculate total cost from component prices
  const products = await prisma.product.findMany({
    where: { id: { in: d.components.map((c) => c.productId) } },
    select: { id: true, price: true },
  })
  const priceMap = new Map(products.map((p) => [p.id, Number(p.price)]))
  const totalCostBhd = d.components.reduce((sum, c) => {
    return sum + (priceMap.get(c.productId) ?? 0) * c.qty
  }, d.extraCharge)

  const assembly = await prisma.assembly.upsert({
    where: { productId: d.productId },
    update: {
      extraCharge: d.extraCharge,
      totalCostBhd,
      notes: d.notes,
      components: {
        deleteMany: {},
        create: d.components.map((c, i) => ({
          productId: c.productId,
          qty: c.qty,
          sortOrder: c.sortOrder ?? i,
        })),
      },
    },
    create: {
      productId: d.productId,
      extraCharge: d.extraCharge,
      totalCostBhd,
      notes: d.notes,
      components: {
        create: d.components.map((c, i) => ({
          productId: c.productId,
          qty: c.qty,
          sortOrder: c.sortOrder ?? i,
        })),
      },
    },
    include: {
      product: true,
      components: { include: { product: true } },
    },
  })

  return NextResponse.json(assembly, { status: 201 })
}
