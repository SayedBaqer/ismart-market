import { prisma } from '@/lib/db'
import { Package, Users, ShoppingCart, Award } from 'lucide-react'

export async function StatsBar() {
  const [products, customers, orders] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
    prisma.customer.count().catch(() => 0),
    prisma.order.count({ where: { status: 'COMPLETED' } }).catch(() => 0),
  ])

  const stats = [
    { label: 'Products', value: `${products}+`, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Happy Customers', value: `${customers}+`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Orders Fulfilled', value: `${orders}+`, icon: ShoppingCart, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Quality Assured', value: '100%', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-extrabold text-gray-900 leading-none">{value}</p>
                <p className="mt-0.5 text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
