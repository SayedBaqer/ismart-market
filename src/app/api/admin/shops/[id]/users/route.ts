import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

interface RouteParams { params: Promise<{ id: string }> }

const VALID_ROLES = ['MANAGER', 'STAFF', 'CASHIER'] as const

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: shopId } = await params
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } })
  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  const body = await req.json()
  const { name, email, username, password, role } = body as {
    name?: string; email?: string; username?: string; password?: string; role?: string
  }

  if (!email || !username || !password || !role) {
    return NextResponse.json({ error: 'Email, username, password and role are required' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    return NextResponse.json({ error: 'Username must be 3-32 characters (letters, numbers, dot, dash, underscore)' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Username is the unique login key — admin-created accounts can share an email
  // with other accounts in the same shop, same as owner-created ones.
  const usernameTaken = await prisma.user.findUnique({ where: { username } })
  if (usernameTaken) {
    return NextResponse.json({ error: `Username "${username}" is already taken` }, { status: 409 })
  }

  // Admin-created accounts bypass plan quotas by design — the platform admin has full control.
  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email: email.trim(),
      username,
      passwordHash: hash,
      role: role as typeof VALID_ROLES[number],
      isActive: true,
    },
  })

  const shopUser = await prisma.shopUser.create({
    data: { shopId, userId: user.id, role: role as typeof VALID_ROLES[number] },
    select: { id: true, role: true, user: { select: { id: true, name: true, email: true, username: true, isActive: true } } },
  })

  return NextResponse.json({ ok: true, shopUser }, { status: 201 })
}
