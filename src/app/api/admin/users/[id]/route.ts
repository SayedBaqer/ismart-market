import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CASHIER', 'CUSTOMER']).optional(),
  capabilities: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

async function guard(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) return null
  return session
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!await guard(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { ...data }

  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12)
    delete updateData.password
  }
  if (data.capabilities !== undefined) {
    updateData.capabilities = data.capabilities
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true, capabilities: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await guard(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const me = (session.user as { id?: string }).id
  if (id === me) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await prisma.user.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
