import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { updateProduct, deleteProduct } from '@/lib/services/product.service'
import { updateProductSchema } from '@/lib/validators/product'

async function getShopUser(userId: string) {
  return prisma.shopUser.findFirst({ where: { userId } })
}

async function assertOwnedProduct(shopId: string, id: string) {
  const product = await prisma.product.findUnique({ where: { id }, select: { shopId: true } })
  return !!product && product.shopId === shopId
}

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, stockMeta: true, variants: true },
  })

  if (!product || product.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!(await assertOwnedProduct(shopUser.shopId, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateProductSchema.safeParse({ ...body, id })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const product = await updateProduct(parsed.data)
    return NextResponse.json(product)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return NextResponse.json({ error: 'SKU or slug already exists' }, { status: 409 })
    }
    console.error('[shop products PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!(await assertOwnedProduct(shopUser.shopId, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteProduct(id)
  return NextResponse.json({ ok: true })
}
