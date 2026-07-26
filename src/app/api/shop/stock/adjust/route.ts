import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { adjustStock, setAbsoluteQty } from '@/lib/services/stock.service'

const schema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('add'),
    productId: z.string(),
    qty: z.number().positive(),
    unitCostBhd: z.number().min(0).optional(), // optional — purchase cost isn't required to add stock
    reason: z.string().optional(),
  }),
  z.object({
    mode: z.literal('remove'),
    productId: z.string(),
    qty: z.number().positive(),
    reason: z.string().optional(),
  }),
  z.object({
    mode: z.literal('set'),
    productId: z.string(),
    qty: z.number().min(0),
    reason: z.string().optional(),
  }),
])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  // Verify the product belongs to this shop before touching its stock
  const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { shopId: true } })
  if (!product || product.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  try {
    if (data.mode === 'set') {
      await setAbsoluteQty({
        productId: data.productId,
        targetQty: data.qty,
        createdById: session.user.id,
        reason: data.reason ?? 'Manual stock count',
      })
    } else if (data.mode === 'add') {
      await adjustStock({
        productId: data.productId,
        qty: data.qty,
        costBhd: data.unitCostBhd ?? 0,
        createdById: session.user.id,
        reason: data.reason ?? 'Stock received',
        type: 'IMPORT',
      })
    } else {
      await adjustStock({
        productId: data.productId,
        qty: -data.qty,
        costBhd: 0,
        createdById: session.user.id,
        reason: data.reason ?? 'Manual removal',
        type: 'MANUAL',
      })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stock adjustment failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
