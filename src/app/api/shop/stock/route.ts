import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'

async function getShopUser(userId: string) {
  return prisma.shopUser.findFirst({ where: { userId } })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q') ?? ''

  const products = await prisma.product.findMany({
    where: {
      shopId: shopUser.shopId,
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

  const rows = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    price: Number(p.price),
    comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
    currentQty: p.stockMeta ? Number(p.stockMeta.currentQty) : 0,
    avgCostBhd: p.stockMeta ? Number(p.stockMeta.avgCostBhd) : 0,
    threshold: p.stockMeta?.threshold ?? null,
  }))

  return NextResponse.json({ rows })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { updates } = await req.json() as {
    updates: { id: string; price: number; comparePrice?: number | null }[]
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  // Verify all products belong to this shop
  const ids = updates.map((u) => u.id)
  const count = await prisma.product.count({
    where: { id: { in: ids }, shopId: shopUser.shopId },
  })
  if (count !== ids.length) {
    return NextResponse.json({ error: 'Unauthorized product' }, { status: 403 })
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
