import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const shop = await prisma.shop.findUnique({ where: { id }, select: { id: true, settings: true } })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const settings = (shop.settings ?? {}) as Record<string, unknown>
  return NextResponse.json({ policy: settings.approvalPolicy ?? defaultPolicy() })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  const shop = await prisma.shop.findUnique({ where: { id }, select: { settings: true } })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = (shop.settings ?? {}) as Record<string, unknown>
  const currentPolicy = (existing.approvalPolicy ?? defaultPolicy()) as Record<string, unknown>

  const newPolicy = {
    ...currentPolicy,
    ...body,
    activities: { ...(currentPolicy.activities as object ?? {}), ...(body.activities ?? {}) },
    trust: { ...(currentPolicy.trust as object ?? {}), ...(body.trust ?? {}) },
  }

  await prisma.shop.update({
    where: { id },
    data: { settings: { ...existing, approvalPolicy: newPolicy } },
  })

  return NextResponse.json({ policy: newPolicy })
}

export function defaultPolicy() {
  return {
    level: 'STANDARD', // RESTRICTED | STANDARD | TRUSTED | AUTO
    activities: {
      products: 'APPROVE',    // APPROVE | AUTO
      categories: 'AUTO',
      pageDesign: 'APPROVE',
      news: 'APPROVE',
      prices: 'AUTO',
      promotions: 'APPROVE',
    },
    trust: {
      level: 'BASIC', // BASIC | VERIFIED | TRUSTED | PREMIUM
      verifiedAt: null as string | null,
      badges: [] as string[],
    },
  }
}
