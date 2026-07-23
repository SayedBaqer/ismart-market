import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { getSetting } from '@/lib/services/settings.service'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Package, ShoppingCart, AlertTriangle, Users, TrendingUp,
  DollarSign, ArrowRight, Activity, BarChart3, Clock,
} from 'lucide-react'

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user) return null

  const currency = (await getSetting('currency.base')) ?? 'BHD'

  const [productCount, orderCount, customerCount, recentOrders, orderStats, topProducts, pendingOrders] =
    await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { displayName: true } } },
      }),
      prisma.order.aggregate({
        _sum: { grandTotal: true },
        _count: true,
        where: { status: 'COMPLETED' },
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'name'],
        _sum: { qty: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
        where: { productId: { not: null } },
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
    ])

  const allStock = await prisma.stockMeta.findMany({
    where: { threshold: { not: null } },
    select: { currentQty: true, threshold: true },
  })
  const lowStockCount = allStock.filter(
    (s: { currentQty: number; threshold: number | null }) =>
      s.threshold != null && s.currentQty <= s.threshold
  ).length

  const STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning', PROCESSING: 'info', SHIPPED: 'info',
    COMPLETED: 'success', CANCELLED: 'danger', REFUNDED: 'danger',
  }

  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(Number(orderStats._sum.grandTotal ?? 0), currency),
      sub: `${orderStats._count} completed`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      href: '/admin/reports',
    },
    {
      label: 'Active Products',
      value: productCount,
      sub: 'in catalogue',
      icon: Package,
      gradient: 'from-blue-500 to-blue-700',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      href: '/admin/products',
    },
    {
      label: 'Total Orders',
      value: orderCount,
      sub: `${pendingOrders} pending`,
      icon: ShoppingCart,
      gradient: 'from-violet-500 to-purple-700',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      href: '/admin/orders',
    },
    {
      label: 'Customers',
      value: customerCount,
      sub: 'registered',
      icon: Users,
      gradient: 'from-orange-500 to-amber-600',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      href: '/admin/customers',
    },
  ]

  const quickActions = [
    { label: 'New Product', href: '/admin/products/new', icon: Package, color: 'bg-blue-600' },
    { label: 'New Invoice', href: '/admin/billing/new', icon: BarChart3, color: 'bg-violet-600' },
    { label: 'View Orders', href: '/admin/orders', icon: ShoppingCart, color: 'bg-emerald-600' },
    { label: 'Reports', href: '/admin/reports', icon: TrendingUp, color: 'bg-orange-600' },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Welcome bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome back, {session.user.name?.split(' ')[0] ?? 'Admin'}
            <span className="ml-2 text-gray-300">·</span>
            <span className="ml-2">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </p>
        </div>
        {lowStockCount > 0 && (
          <Link
            href="/admin/stock"
            className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 shadow-sm hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowStockCount} low stock item{lowStockCount > 1 ? 's' : ''}
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, gradient, bg, text, href }) => (
          <Link key={label} href={href} className="group block">
            <Card className="overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <CardContent className="p-0">
                <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />
                <div className="flex items-center gap-4 p-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${bg}`}>
                    <Icon className={`h-5 w-5 ${text}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-extrabold text-gray-900 truncate">{value}</p>
                    <p className="text-xs text-gray-500 truncate">{label}</p>
                    <p className="text-[11px] text-gray-400 truncate">{sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map(({ label, href, icon: Icon, color }) => (
          <Link
            key={label}
            href={href}
            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-gray-300 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top products */}
        <Card>
          <CardContent className="py-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Top Products</p>
              </div>
              <Link href="/admin/reports" className="text-xs text-blue-600 hover:underline">Report →</Link>
            </div>
            {topProducts.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400">No sales data yet</div>
            ) : (
              <ul className="space-y-3">
                {topProducts.map((p: { productId: string | null; name: string; _sum: { lineTotal: unknown; qty: unknown } }, i) => (
                  <li key={p.productId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm text-gray-700">{p.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-gray-900">
                      {formatCurrency(Number(p._sum.lineTotal ?? 0), currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                  <Activity className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Recent Orders</p>
              </div>
              <Link href="/admin/orders" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No orders yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentOrders.map((o: { id: string; orderNumber: string; status: string; customerName: string | null; customer: { displayName: string } | null; grandTotal: unknown; currency: string; createdAt: Date }) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <ShoppingCart className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-600">{o.orderNumber}</span>
                        <Badge variant={STATUS_COLORS[o.status] ?? 'default'} className="text-[10px]">
                          {o.status}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-gray-500">
                        {o.customerName ?? o.customer?.displayName ?? 'Guest'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(o.grandTotal), o.currency)}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(o.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
