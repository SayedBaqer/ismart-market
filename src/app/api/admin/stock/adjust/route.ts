import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { adjustStock, setAbsoluteQty } from '@/lib/services/stock.service'

const schema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('add'),
    productId: z.string(),
    qty: z.number().positive(),
    unitCostBhd: z.number().min(0).optional(),
    unitCostCny: z.number().min(0).optional(),
    reference: z.string().optional(),
    reason: z.string().optional(),
  }),
  z.object({
    mode: z.literal('remove'),
    productId: z.string(),
    qty: z.number().positive(),
    reason: z.string().optional(),
    reference: z.string().optional(),
  }),
  z.object({
    mode: z.literal('set'),
    productId: z.string(),
    qty: z.number().min(0),
    reason: z.string().optional(),
    reference: z.string().optional(),
  }),
])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id ?? ''

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  try {
    if (data.mode === 'set') {
      await setAbsoluteQty({
        productId: data.productId,
        targetQty: data.qty,       // correct param name
        createdById: userId,       // correct param name
        reason: data.reason,
      })
    } else if (data.mode === 'add') {
      await adjustStock({
        productId: data.productId,
        qty: data.qty,             // correct param name
        costBhd: data.unitCostBhd ?? 0,   // correct param name
        costCny: data.unitCostCny ?? 0,   // correct param name
        createdById: userId,       // correct param name
        reason: data.reason ?? 'Manual receive',
        reference: data.reference,
        type: 'IMPORT',
      })
    } else {
      await adjustStock({
        productId: data.productId,
        qty: -data.qty,
        costBhd: 0,
        costCny: 0,
        createdById: userId,
        reason: data.reason ?? 'Manual removal',
        reference: data.reference,
        type: 'MANUAL',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stock adjustment failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
