import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ orders: [] })

  const userId = (session.user as { id: string }).id

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { customerId: { not: null }, customer: { userId } },
        { customerEmail: session.user.email ?? undefined },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      grandTotal: true,
      currency: true,
      createdAt: true,
      shop: { select: { name: true, logoUrl: true } },
      lineItems: { select: { name: true }, take: 1 },
    },
  })

  return NextResponse.json({ orders })
}
