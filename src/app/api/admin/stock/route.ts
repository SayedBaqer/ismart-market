import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { updates } = await req.json() as {
    updates: { id: string; price: number; comparePrice?: number | null }[]
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.product.update({
        where: { id: u.id },
        data: {
          price: u.price,
          comparePrice: u.comparePrice ?? null,
        },
      })
    )
  )

  return NextResponse.json({ updated: updates.length })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q') ?? ''

  const products = await prisma.product.findMany({
    where: {
      trackStock: true,
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, ...ci() } },
          { sku: { contains: q, ...ci() } },
        ],
      }),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true, sku: true, name: true, price: true, comparePrice: true,
      stockMeta: true,
      fifoBatches: {
        where: { qtyRemaining: { gt: 0 } },
        orderBy: { receivedAt: 'asc' },
      },
    },
  })

  // Cost/purchase-price data is the shop owner's private business data — never
  // returned to platform admin, only quantity/threshold for stock management.
  const rows = products.map((p: typeof products[number]) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    price: Number(p.price),
    comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
    currentQty: p.stockMeta ? Number(p.stockMeta.currentQty) : 0,
    threshold: p.stockMeta?.threshold ?? null,
    batches: p.fifoBatches.map((b: typeof p.fifoBatches[number]) => ({
      id: b.id,
      qtyReceived: Number(b.qtyReceived),
      qtyRemaining: Number(b.qtyRemaining),
      reference: b.reference,
      receivedAt: b.receivedAt.toISOString(),
    })),
  }))

  return NextResponse.json({ rows })
}
