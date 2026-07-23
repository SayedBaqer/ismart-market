import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, rlKey, tooManyRequests } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  email: z.string().email(),
  phone: z.string().min(1).max(30),
  address: z.string().min(1).max(300),
  description: z.string().max(500).optional(),
  currency: z.string().default('BHD'),
  language: z.string().default('en'),
})

export async function POST(req: NextRequest) {
  // 5 registrations per day per IP
  const rl = rateLimit(rlKey(req, 'shops:register'), { limit: 5, windowMs: 24 * 60 * 60 * 1000 })
  if (!rl.allowed) return tooManyRequests(rl.resetAt)

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { slug } = parsed.data
  const existing = await prisma.shop.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'That shop URL is already taken. Please choose another.' }, { status: 409 })
  }

  const shop = await prisma.shop.create({
    data: {
      name: parsed.data.name,
      slug,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      description: parsed.data.description || undefined,
      currency: parsed.data.currency,
      language: parsed.data.language,
      status: 'PENDING', // awaits platform admin approval
    },
  })

  return NextResponse.json({ id: shop.id, status: 'PENDING' }, { status: 201 })
}
