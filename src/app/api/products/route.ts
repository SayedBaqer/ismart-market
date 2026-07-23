import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createProduct, getProducts } from '@/lib/services/product.service'
import { createProductSchema } from '@/lib/validators/product'
import { hasCapability } from '@/lib/auth/capabilities'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? 20), 200)
  const search = searchParams.get('q') ?? undefined
  const categoryId = searchParams.get('categoryId') ?? undefined
  const isActive = searchParams.has('isActive')
    ? searchParams.get('isActive') === 'true'
    : undefined

  const result = await getProducts({ search, categoryId, isActive, page, pageSize })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasCapability(session.user.role, session.user.capabilities, 'products.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const product = await createProduct(parsed.data, session.user.id)
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return NextResponse.json({ error: 'SKU or slug already exists' }, { status: 409 })
    }
    console.error('[products POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
