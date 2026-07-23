import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const order = await prisma.order.findFirst({ where: { id, shopId: shopUser.shopId } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { deliveryStatus, assignedToId, deliveryNotes } = body

  const update: Record<string, unknown> = {}
  if (deliveryStatus) update.deliveryStatus = deliveryStatus
  if (assignedToId !== undefined) update.assignedToId = assignedToId || null
  if (deliveryNotes !== undefined) update.deliveryNotes = deliveryNotes
  if (deliveryStatus === 'DELIVERED') update.deliveredAt = new Date()

  // If order status should also advance
  if (deliveryStatus === 'DELIVERED') update.status = 'COMPLETED'
  if (deliveryStatus === 'OUT_FOR_DELIVERY') update.status = 'SHIPPED'

  const updated = await prisma.order.update({ where: { id }, data: update })
  return NextResponse.json({ order: updated })
}
