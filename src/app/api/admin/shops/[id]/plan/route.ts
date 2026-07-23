import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

  const { id } = await params
  const { plan, planExpiry, quotas, featureOverrides } = await req.json()

  const shop = await prisma.shop.findUnique({ where: { id }, select: { settings: true } })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existingSettings = (shop.settings ?? {}) as Record<string, unknown>

  const updated = await prisma.shop.update({
    where: { id },
    data: {
      ...(plan ? { plan } : {}),
      ...(planExpiry !== undefined ? { planExpiry: planExpiry ? new Date(planExpiry) : null } : {}),
      settings: {
        ...existingSettings,
        ...(quotas ? { quotas } : {}),
        ...(featureOverrides !== undefined ? { featureOverrides } : {}),
      },
    },
  })

  return NextResponse.json({ shop: updated })
}
