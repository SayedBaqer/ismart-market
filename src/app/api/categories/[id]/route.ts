import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { updateCategory, deleteCategory } from '@/lib/services/product.service'
import { updateCategorySchema } from '@/lib/validators/product'
import { hasCapability } from '@/lib/auth/capabilities'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const category = await prisma.category.findUnique({
    where: { id },
    include: { children: true, parent: true },
  })
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(category)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasCapability(session.user.role, session.user.capabilities, 'categories.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateCategorySchema.safeParse({ ...body, id })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const category = await updateCategory(parsed.data)
    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasCapability(session.user.role, session.user.capabilities, 'categories.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await deleteCategory(id)
  return NextResponse.json({ success: true })
}
