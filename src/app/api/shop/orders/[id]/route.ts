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
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order || order.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { action, notes, cancelReason } = body

  // Validate state transitions
  const current = order.status
  let nextStatus: string | null = null

  if (action === 'confirm' && current === 'PENDING') nextStatus = 'PROCESSING'
  else if (action === 'ship' && current === 'PROCESSING') nextStatus = 'SHIPPED'
  else if (action === 'complete' && current === 'SHIPPED') nextStatus = 'COMPLETED'
  else if (action === 'cancel' && ['PENDING', 'PROCESSING'].includes(current)) nextStatus = 'CANCELLED'
  else {
    return NextResponse.json({ error: `Cannot perform "${action}" on a ${current} order` }, { status: 400 })
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: nextStatus as never,
      notes: cancelReason ? `Cancelled: ${cancelReason}` : notes ?? order.notes,
      ...(nextStatus === 'CANCELLED' ? { deliveryStatus: 'NOT_ASSIGNED' } : {}),
    },
  })

  return NextResponse.json({ order: updated })
}
