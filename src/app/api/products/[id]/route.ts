import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getProductById, updateProduct, deleteProduct } from '@/lib/services/product.service'
import { updateProductSchema } from '@/lib/validators/product'
import { hasCapability } from '@/lib/auth/capabilities'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const product = await getProductById(id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasCapability(session.user.role, session.user.capabilities, 'products.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateProductSchema.safeParse({ ...body, id })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const product = await updateProduct(parsed.data)
    return NextResponse.json(product)
  } catch (err) {
    console.error('[products PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasCapability(session.user.role, session.user.capabilities, 'products.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await deleteProduct(id)
  return NextResponse.json({ success: true })
}
