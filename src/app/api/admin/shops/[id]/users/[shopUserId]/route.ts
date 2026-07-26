import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

interface RouteParams { params: Promise<{ id: string; shopUserId: string }> }

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, shopUserId } = await params
  const target = await prisma.shopUser.findFirst({
    where: { id: shopUserId, shopId: id },
    select: { userId: true },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { isActive, newPassword } = body as { isActive?: boolean; newPassword?: string }

  const data: Record<string, unknown> = {}
  if (isActive !== undefined) data.isActive = isActive
  if (newPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    data.passwordHash = await bcrypt.hash(newPassword, 12)
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: target.userId },
    data,
    select: { id: true, isActive: true },
  })

  return NextResponse.json({ ok: true, user })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, shopUserId } = await params
  const target = await prisma.shopUser.findFirst({ where: { id: shopUserId, shopId: id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.shopUser.delete({ where: { id: shopUserId } })
  return NextResponse.json({ ok: true })
}
