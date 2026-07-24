import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Free plan quotas — super admin can raise these via shop.meta.staffQuota
const FREE_QUOTA = { STAFF: 1, CASHIER: 1 } // 1 sales + 1 delivery

async function getShopAndOwner(userId: string) {
  return prisma.shopUser.findFirst({
    where: { userId },
    include: { shop: { select: { id: true, meta: true } } },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const su = await getShopAndOwner(session.user.id)
  if (!su) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const shopUsers = await prisma.shopUser.findMany({
    where: { shopId: su.shop.id },
    include: { user: { select: { id: true, name: true, email: true, isActive: true, createdAt: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  const staff = shopUsers.map((s) => ({
    ...s.user,
    role: s.role,
    shopUserId: s.id,
    joinedAt: s.joinedAt,
  }))

  // Compute quota usage
  const meta = (su.shop.meta ?? {}) as Record<string, unknown>
  const quotaOverride = (meta.staffQuota ?? {}) as Record<string, number>
  const quota = {
    STAFF: quotaOverride.STAFF ?? FREE_QUOTA.STAFF,
    CASHIER: quotaOverride.CASHIER ?? FREE_QUOTA.CASHIER,
  }
  const used = {
    STAFF: staff.filter((s) => s.role === 'STAFF').length,
    CASHIER: staff.filter((s) => s.role === 'CASHIER').length,
  }

  return NextResponse.json({ staff, quota, used })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const su = await getShopAndOwner(session.user.id)
  if (!su || su.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only shop owners can add staff' }, { status: 403 })
  }

  const { name, email, password, role } = await req.json() as {
    name?: string; email?: string; password?: string; role?: string
  }

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Email, password and role are required' }, { status: 400 })
  }

  // Only STAFF (sales) and CASHIER (delivery) can be added this way
  if (!['STAFF', 'CASHIER'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Only Sales (STAFF) or Delivery (CASHIER) accounts can be created.' }, { status: 400 })
  }

  // Enforce free plan quota
  const meta = (su.shop.meta ?? {}) as Record<string, unknown>
  const quotaOverride = (meta.staffQuota ?? {}) as Record<string, number>
  const maxAllowed = quotaOverride[role] ?? FREE_QUOTA[role as keyof typeof FREE_QUOTA] ?? 1

  const currentCount = await prisma.shopUser.count({
    where: { shopId: su.shop.id, role: role as 'STAFF' | 'CASHIER' },
  })

  if (currentCount >= maxAllowed) {
    const label = role === 'STAFF' ? 'Sales' : 'Delivery'
    return NextResponse.json({
      error: `Free plan includes ${maxAllowed} ${label} account. Upgrade your plan to add more.`,
      code: 'QUOTA_EXCEEDED',
    }, { status: 402 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const existing = await prisma.shopUser.findUnique({
      where: { shopId_userId: { shopId: su.shop.id, userId: user.id } },
    })
    if (existing) return NextResponse.json({ error: 'This email is already a member of your shop' }, { status: 409 })
  } else {
    const hash = await bcrypt.hash(password, 12)
    user = await prisma.user.create({
      data: {
        name: name?.trim() || null,
        email,
        passwordHash: hash,
        role: role as 'STAFF' | 'CASHIER',
        isActive: true,
      },
    })
  }

  await prisma.shopUser.create({
    data: { shopId: su.shop.id, userId: user.id, role: role as 'STAFF' | 'CASHIER' },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const su = await getShopAndOwner(session.user.id)
  if (!su || su.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { shopUserId } = await req.json() as { shopUserId?: string }
  if (!shopUserId) return NextResponse.json({ error: 'shopUserId required' }, { status: 400 })

  // Verify the target belongs to this shop and is not the owner
  const target = await prisma.shopUser.findFirst({
    where: { id: shopUserId, shopId: su.shop.id },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'MANAGER') return NextResponse.json({ error: 'Cannot remove the shop owner' }, { status: 400 })

  await prisma.shopUser.delete({ where: { id: shopUserId } })
  return NextResponse.json({ ok: true })
}
