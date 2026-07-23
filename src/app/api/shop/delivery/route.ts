import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const where: Record<string, unknown> = { shopId: shopUser.shopId }
  if (shopUser.role === 'CASHIER') {
    where.assignedToId = session.user.id
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { assignedTo: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ orders })
}
