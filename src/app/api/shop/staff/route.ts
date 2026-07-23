import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const shopUsers = await prisma.shopUser.findMany({
    where: { shopId: shopUser.shopId },
    include: { user: { select: { id: true, name: true, email: true, isActive: true, createdAt: true } } },
  })

  const staff = shopUsers.map((su) => ({
    ...su.user,
    role: su.role,
    shopUserId: su.id,
    joinedAt: su.joinedAt,
  }))

  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only shop owners can add staff' }, { status: 403 })
  }

  const { name, email, password, role } = await req.json()
  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Email, password and role are required' }, { status: 400 })
  }

  const validRoles = ['MANAGER', 'STAFF', 'CASHIER']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    // Check not already in this shop
    const existing = await prisma.shopUser.findUnique({ where: { shopId_userId: { shopId: shopUser.shopId, userId: user.id } } })
    if (existing) return NextResponse.json({ error: 'User already in this shop' }, { status: 409 })
  } else {
    const hash = await bcrypt.hash(password, 12)
    user = await prisma.user.create({
      data: { name, email, passwordHash: hash, role: role as 'MANAGER' | 'STAFF' | 'CASHIER', isActive: true },
    })
  }

  await prisma.shopUser.create({ data: { shopId: shopUser.shopId, userId: user.id, role: role as 'MANAGER' | 'STAFF' | 'CASHIER' } })

  return NextResponse.json({ success: true })
}
