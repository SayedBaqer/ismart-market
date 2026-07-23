import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCategories, createCategory } from '@/lib/services/product.service'
import { createCategorySchema } from '@/lib/validators/product'
import { hasCapability } from '@/lib/auth/capabilities'

export async function GET() {
  const categories = await getCategories()
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasCapability(session.user.role, session.user.capabilities, 'categories.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const category = await createCategory(parsed.data)
    return NextResponse.json(category, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
