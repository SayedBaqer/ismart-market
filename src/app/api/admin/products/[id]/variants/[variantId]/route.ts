import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string; variantId: string }> }

const updateSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  attributes: z.record(z.string()).optional(),
  price: z.number().min(0).optional(),
  stockQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { variantId } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: parsed.data,
  })

  return NextResponse.json(variant)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { variantId } = await params
  await prisma.productVariant.delete({ where: { id: variantId } })
  return NextResponse.json({ ok: true })
}
