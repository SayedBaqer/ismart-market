import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

async function getShop(userId: string) {
  return prisma.shopUser.findFirst({
    where: { userId },
    include: { shop: { select: { id: true, meta: true } } },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const shopUser = await getShop((session.user as { id: string }).id)
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 404 })

  const meta = (shopUser.shop.meta ?? {}) as Record<string, unknown>
  const tax = (meta.tax ?? { enabled: false, rate: 10, inclusive: false }) as Record<string, unknown>
  return NextResponse.json({ tax })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const shopUser = await getShop((session.user as { id: string }).id)
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 404 })
  if (!['MANAGER'].includes(shopUser.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const tax = {
    enabled: Boolean(body.enabled),
    rate: Math.max(0, Math.min(100, Number(body.rate ?? 0))),
    inclusive: Boolean(body.inclusive),
    label: String(body.label ?? 'Tax').slice(0, 50),
    number: String(body.number ?? '').slice(0, 100),
  }

  const currentMeta = (shopUser.shop.meta ?? {}) as Record<string, unknown>
  await prisma.shop.update({
    where: { id: shopUser.shop.id },
    data: { meta: { ...currentMeta, tax } },
  })

  return NextResponse.json({ ok: true, tax })
}
