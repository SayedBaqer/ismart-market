import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: shopId } = await params
  const { action } = await req.json() // 'approve' | 'reject'

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = (shop.settings ?? {}) as Record<string, unknown>
  const pending = settings.displayPending as Record<string, unknown> | null

  if (!pending) return NextResponse.json({ error: 'No pending display changes' }, { status: 400 })

  let updated: Record<string, unknown>
  if (action === 'approve') {
    updated = {
      ...settings,
      display: { ...pending, status: 'approved', approvedAt: new Date().toISOString() },
      displayPending: null,
    }
  } else {
    updated = {
      ...settings,
      displayPending: { ...pending, status: 'rejected', rejectedAt: new Date().toISOString() },
    }
  }

  await prisma.shop.update({ where: { id: shopId }, data: { settings: updated } })
  return NextResponse.json({ success: true, action })
}
