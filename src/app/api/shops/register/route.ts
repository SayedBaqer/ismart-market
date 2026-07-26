import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { rateLimit, rlKey, tooManyRequests } from '@/lib/rate-limit'

const schema = z.object({
  // Account info — required only when not logged in
  ownerName: z.string().min(1).max(100).optional(),
  ownerEmail: z.string().email().optional(),
  ownerPassword: z.string().min(8).optional(),
  // Shop info
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  phone: z.string().min(1).max(30),
  address: z.string().min(1).max(300),
  description: z.string().max(500).optional(),
  currency: z.string().default('BHD'),
  language: z.string().default('en'),
})

export async function POST(req: NextRequest) {
  const rl = rateLimit(rlKey(req, 'shops:register'), { limit: 5, windowMs: 24 * 60 * 60 * 1000 })
  if (!rl.allowed) return tooManyRequests(rl.resetAt)

  const session = await auth()
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  // Resolve who the owner is
  let ownerId: string

  if (session?.user?.id) {
    // Already logged in — use their account
    ownerId = session.user.id
  } else {
    // Guest — create a new owner account
    if (!data.ownerEmail || !data.ownerPassword || !data.ownerName) {
      return NextResponse.json({ error: 'Name, email and password are required to create your account' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({ where: { email: data.ownerEmail } })
    if (existing) {
      return NextResponse.json({ error: 'email_taken', message: 'An account with this email already exists. Please sign in first.' }, { status: 409 })
    }

    const hash = await bcrypt.hash(data.ownerPassword, 12)
    const newUser = await prisma.user.create({
      data: {
        name: data.ownerName.trim(),
        email: data.ownerEmail,
        passwordHash: hash,
        role: 'MANAGER',
        isActive: true,
      },
    })
    ownerId = newUser.id
  }

  // Check slug availability
  const existingShop = await prisma.shop.findUnique({ where: { slug: data.slug } })
  if (existingShop) {
    return NextResponse.json({ error: 'slug_taken', message: 'That shop URL is already taken. Please choose another.' }, { status: 409 })
  }

  // Check if this owner already has a shop
  const existingOwnership = await prisma.shopUser.findFirst({ where: { userId: ownerId, role: 'MANAGER' } })
  if (existingOwnership) {
    return NextResponse.json({ error: 'already_has_shop', message: 'You already own a shop. Go to your shop dashboard to manage it.' }, { status: 409 })
  }

  // Create shop and link owner atomically
  const shop = await prisma.$transaction(async (tx) => {
    const s = await tx.shop.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone: data.phone,
        address: data.address,
        description: data.description || undefined,
        currency: data.currency,
        language: data.language,
        status: 'PENDING',
      },
    })
    await tx.shopUser.create({
      data: { shopId: s.id, userId: ownerId, role: 'MANAGER' },
    })
    return s
  })

  return NextResponse.json({
    id: shop.id,
    status: 'PENDING',
    ownerId,
    // Signal to client whether to auto-sign-in
    newAccount: !session?.user?.id,
    ownerEmail: data.ownerEmail,
  }, { status: 201 })
}
