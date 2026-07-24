import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveryStatus: true,
      customerName: true,
      grandTotal: true,
      currency: true,
      createdAt: true,
      confirmedAt: true,
      preparedAt: true,
      transferredAt: true,
      deliveredAt: true,
      deliveryAddress: true,
      lineItems: { select: { name: true, qty: true, unitPrice: true }, orderBy: { sortOrder: 'asc' } },
      shop: { select: { name: true, logoUrl: true, phone: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({ order })
}
