import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      lineItems: { orderBy: { sortOrder: 'asc' }, include: { product: { select: { slug: true, images: true } } } },
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { name: true } },
    },
  })

  if (!order || order.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ order })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order || order.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { action, notes, cancelReason, pickupAddress, deliveryAddress } = body
  const role = shopUser.role
  const current = order.status
  const now = new Date()

  // ── State machine ──────────────────────────────────────────────────────────
  // PENDING → CONFIRMED (MANAGER or STAFF)
  // CONFIRMED → PREPARED (MANAGER or STAFF)
  // PREPARED → IN_DELIVERY (MANAGER or STAFF — transfer to delivery)
  // IN_DELIVERY → COMPLETED (CASHIER / delivery staff)
  // Any non-completed → CANCELLED (MANAGER only)

  let update: Record<string, unknown> = {}

  if (action === 'confirm' && current === 'PENDING' && ['MANAGER', 'STAFF'].includes(role)) {
    update = { status: 'CONFIRMED', confirmedAt: now }
  } else if (action === 'prepare' && current === 'CONFIRMED' && ['MANAGER', 'STAFF'].includes(role)) {
    update = { status: 'PREPARED', preparedAt: now }
  } else if (action === 'transfer_delivery' && current === 'PREPARED' && ['MANAGER', 'STAFF'].includes(role)) {
    update = {
      status: 'IN_DELIVERY',
      transferredAt: now,
      deliveryStatus: 'ASSIGNED',
      pickupAddress: pickupAddress ?? order.pickupAddress,
      deliveryAddress: deliveryAddress ?? order.deliveryAddress,
    }
  } else if (action === 'deliver' && current === 'IN_DELIVERY' && ['MANAGER', 'STAFF', 'CASHIER'].includes(role)) {
    update = { status: 'COMPLETED', deliveredAt: now, deliveryStatus: 'DELIVERED' }
  } else if (action === 'complete' && ['SHIPPED', 'PROCESSING'].includes(current) && ['MANAGER', 'STAFF'].includes(role)) {
    // Legacy path
    update = { status: 'COMPLETED', deliveredAt: now }
  } else if (action === 'cancel' && !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(current) && role === 'MANAGER') {
    update = {
      status: 'CANCELLED',
      deliveryStatus: 'NOT_ASSIGNED',
      notes: cancelReason ? `Cancelled: ${cancelReason}` : order.notes,
    }
  } else {
    return NextResponse.json({ error: `Cannot perform "${action}" on a ${current} order with role ${role}` }, { status: 400 })
  }

  if (notes) update.notes = notes

  const updated = await prisma.order.update({ where: { id }, data: update as never })
  return NextResponse.json({ order: updated })
}
