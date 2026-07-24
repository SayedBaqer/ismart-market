import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: { name, email, passwordHash, role: 'CUSTOMER', isActive: true },
  })

  return NextResponse.json({ ok: true })
}
