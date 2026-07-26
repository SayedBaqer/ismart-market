import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

async function getShopUser(userId: string) {
  return prisma.shopUser.findFirst({ where: { userId } })
}

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only the shop owner can manage branches' }, { status: 403 })
  }

  const { id } = await params
  const branch = await prisma.shopBranch.findUnique({ where: { id } })
  if (!branch || branch.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { name, address, phone, isActive } = body as {
    name?: string; address?: string; phone?: string; isActive?: boolean
  }
  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: 'Branch name cannot be empty' }, { status: 400 })
  }

  const updated = await prisma.shopBranch.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(address !== undefined && { address: address.trim() || null }),
      ...(phone !== undefined && { phone: phone.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json({ branch: updated })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only the shop owner can manage branches' }, { status: 403 })
  }

  const { id } = await params
  const branch = await prisma.shopBranch.findUnique({ where: { id } })
  if (!branch || branch.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (branch.isMain) {
    return NextResponse.json({ error: 'Cannot delete the main branch' }, { status: 400 })
  }

  await prisma.shopBranch.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
