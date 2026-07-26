import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingCart, Package, Users, Truck, TrendingUp, Clock, CheckCircle, AlertCircle, Box, Store } from 'lucide-react'

export default async function ShopDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/admin/login')

  const shopUser = await prisma.shopUser.findFirst({
    where: { userId: session.user.id },
    include: { shop: true },
  })
  if (!shopUser) redirect('/no-shop')

  const shopId = shopUser.shop.id
  const role = shopUser.role

  const [orderCounts, recentOrders, stockAlerts, customerCount] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where: { shopId },
      _count: true,
    }),
    prisma.order.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { customer: { select: { displayName: true } } },
    }),
    prisma.stockMeta.findMany({
      where: {
        product: { shopId },
        threshold: { not: null },
      },
      select: { currentQty: true, threshold: true, product: { select: { name: true } } },
    }),
    prisma.customer.count({ where: { shopId } }),
  ])

  const totalOrders = orderCounts.reduce((s, r) => s + r._count, 0)
  const pendingCount = orderCounts.find((r) => r.status === 'PENDING')?._count ?? 0
  const completedCount = orderCounts.find((r) => r.status === 'COMPLETED')?._count ?? 0
  const lowStock = stockAlerts.filter((s) => s.threshold != null && s.currentQty <= s.threshold)

  const STATUS_COLOR: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
    REFUNDED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {role === 'CASHIER' ? 'My Deliveries' : 'Shop Dashboard'}
        </h1>
        <p className="text-sm text-gray-500">{shopUser.shop.name} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/shop/orders" className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-sm hover:shadow-md transition-shadow">
          <ShoppingCart className="h-6 w-6 text-blue-200 mb-2" />
          <p className="text-3xl font-bold">{totalOrders}</p>
          <p className="text-xs text-blue-200 mt-0.5">Total Orders</p>
        </Link>

        <Link href="/shop/orders?status=PENDING" className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-white shadow-sm hover:shadow-md transition-shadow">
          <Clock className="h-6 w-6 text-amber-100 mb-2" />
          <p className="text-3xl font-bold">{pendingCount}</p>
          <p className="text-xs text-amber-100 mt-0.5">Pending</p>
        </Link>

        <Link href="/shop/delivery" className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white shadow-sm hover:shadow-md transition-shadow">
          <Truck className="h-6 w-6 text-purple-200 mb-2" />
          <p className="text-3xl font-bold">{orderCounts.find((r) => r.status === 'SHIPPED')?._count ?? 0}</p>
          <p className="text-xs text-purple-200 mt-0.5">In Delivery</p>
        </Link>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-sm">
          <CheckCircle className="h-6 w-6 text-emerald-200 mb-2" />
          <p className="text-3xl font-bold">{completedCount}</p>
          <p className="text-xs text-emerald-200 mt-0.5">Completed</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {role !== 'CASHIER' && (
          <Link href="/shop/orders/new" className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">New Order</p>
              <p className="text-xs text-gray-400">Create sale</p>
            </div>
          </Link>
        )}
        <Link href="/shop/delivery" className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-purple-300 transition-all">
          <div className="rounded-xl bg-purple-50 p-2.5">
            <Truck className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Delivery</p>
            <p className="text-xs text-gray-400">Assign & track</p>
          </div>
        </Link>
        {role !== 'CASHIER' && (
          <>
            <Link href="/shop/customers" className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="rounded-xl bg-green-50 p-2.5">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{customerCount} Customers</p>
                <p className="text-xs text-gray-400">View all</p>
              </div>
            </Link>
            <Link href="/shop/stock" className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all">
              <div className={`rounded-xl p-2.5 ${lowStock.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <Package className={`h-5 w-5 ${lowStock.length > 0 ? 'text-red-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Stock</p>
                <p className={`text-xs ${lowStock.length > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {lowStock.length > 0 ? `${lowStock.length} low stock alerts` : 'All stocked'}
                </p>
              </div>
            </Link>
            <Link href="/shop/products" className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="rounded-xl bg-indigo-50 p-2.5">
                <Box className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Products</p>
                <p className="text-xs text-gray-400">Add & manage listings</p>
              </div>
            </Link>
          </>
        )}
        {role === 'MANAGER' && (
          <Link href="/shop/profile" className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="rounded-xl bg-teal-50 p-2.5">
              <Store className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Shop Settings</p>
              <p className="text-xs text-gray-400">Name, branches & page layout</p>
            </div>
          </Link>
        )}
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && role !== 'CASHIER' && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-red-800">Low Stock Alerts ({lowStock.length})</p>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-red-700 truncate max-w-[200px]">{s.product.name}</span>
                <span className="font-bold text-red-600 shrink-0 ml-2">{s.currentQty} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/shop/orders" className="text-xs text-blue-600 font-medium">View all →</Link>
        </div>
        <div className="space-y-2">
          {recentOrders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center text-sm text-gray-400">No orders yet</div>
          ) : recentOrders.map((order) => (
            <Link
              key={order.id}
              href={`/shop/orders/${order.id}`}
              className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">#{order.orderNumber}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{order.customer?.displayName ?? order.customerName ?? 'Guest'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(order.grandTotal), order.currency)}</p>
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
