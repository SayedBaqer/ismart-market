import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const alerts: Array<{ type: 'low_stock' | 'new_order'; message: string; href: string }> = []

  const [lowStock, pendingOrders] = await Promise.all([
    prisma.stockMeta.findMany({
      where: { threshold: { not: null } },
      select: { currentQty: true, threshold: true, product: { select: { name: true } } },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ])

  // Low stock alerts
  for (const s of lowStock) {
    if (s.threshold != null && s.currentQty <= s.threshold) {
      alerts.push({
        type: 'low_stock',
        message: `Low stock: "${s.product.name}" (${s.currentQty} remaining)`,
        href: '/admin/stock',
      })
    }
  }

  // Pending orders
  if (pendingOrders > 0) {
    alerts.push({
      type: 'new_order',
      message: `${pendingOrders} pending order${pendingOrders > 1 ? 's' : ''} awaiting processing`,
      href: '/admin/orders?status=PENDING',
    })
  }

  return NextResponse.json(alerts)
}
