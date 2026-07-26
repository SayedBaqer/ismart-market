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
    include: { user: { select: { id: true, name: true, email: true, username: true, isActive: true, createdAt: true } } },
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

  const { name, email, username, password, role } = await req.json() as {
    name?: string; email?: string; username?: string; password?: string; role?: string
  }

  if (!email || !username || !password || !role) {
    return NextResponse.json({ error: 'Email, username, password and role are required' }, { status: 400 })
  }

  // Only STAFF (sales) and CASHIER (delivery) can be added this way
  if (!['STAFF', 'CASHIER'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Only Sales (STAFF) or Delivery (CASHIER) accounts can be created.' }, { status: 400 })
  }

  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    return NextResponse.json({ error: 'Username must be 3-32 characters (letters, numbers, dot, dash, underscore)' }, { status: 400 })
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

  // Username is the unique login key — multiple accounts (sales, delivery, ...) can share
  // the same shop email, so we don't look accounts up by email here.
  const usernameTaken = await prisma.user.findUnique({ where: { username } })
  if (usernameTaken) {
    return NextResponse.json({ error: `Username "${username}" is already taken` }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email,
      username,
      passwordHash: hash,
      role: role as 'STAFF' | 'CASHIER',
      isActive: true,
    },
  })

  await prisma.shopUser.create({
    data: { shopId: su.shop.id, userId: user.id, role: role as 'STAFF' | 'CASHIER' },
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const su = await getShopAndOwner(session.user.id)
  if (!su || su.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only shop owners can manage staff' }, { status: 403 })
  }

  const { shopUserId, name, email, username, newPassword } = await req.json() as {
    shopUserId?: string; name?: string; email?: string; username?: string; newPassword?: string
  }
  if (!shopUserId) return NextResponse.json({ error: 'shopUserId required' }, { status: 400 })

  const target = await prisma.shopUser.findFirst({ where: { id: shopUserId, shopId: su.shop.id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'MANAGER') return NextResponse.json({ error: 'Cannot modify the shop owner here' }, { status: 400 })

  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 3-32 characters (letters, numbers, dot, dash, underscore)' }, { status: 400 })
    }
    const clash = await prisma.user.findUnique({ where: { username } })
    if (clash && clash.id !== target.userId) {
      return NextResponse.json({ error: `Username "${username}" is already taken` }, { status: 409 })
    }
  }

  if (newPassword && newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name.trim() || null
  if (email !== undefined) data.email = email.trim()
  if (username !== undefined) data.username = username
  if (newPassword) data.passwordHash = await bcrypt.hash(newPassword, 12)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: target.userId },
    data,
    select: { id: true, name: true, email: true, username: true },
  })

  return NextResponse.json({ ok: true, user })
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
