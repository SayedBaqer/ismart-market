'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingCart, Users, DollarSign, Package, BarChart2, Award } from 'lucide-react'
import { useShopT } from '@/components/shop/lang-provider'
import type { ShopTranslations } from '@/lib/i18n/shop'

interface AnalyticsData {
  revenue: {
    today: number; todayOrders: number
    week: number; weekOrders: number
    month: number; monthOrders: number
    allTime: number; allTimeOrders: number
    commission: number; net: number
  }
  orders: { byStatus: Record<string, number>; pending: number; completed: number; cancelled: number }
  topProducts: { productId: string; name: string; revenue: number; qty: number }[]
  topByViews: { id: string; name: string; views: number; salesCount: number; price: unknown }[]
  customers: { total: number; newThisMonth: number }
  daily: { day: string; revenue: number; orders: number }[]
  recentSales: { orderNumber: string; grandTotal: unknown; currency: string; deliveredAt: string | null; customerName: string | null }[]
}

function fmt(n: number) { return n.toFixed(3) }

function KpiCard({ label, value, sub, icon, color = 'blue' }: {
  label: string; value: string; sub?: string
  icon: React.ReactNode; color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-xl font-black text-gray-900 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniBar({ data, field }: { data: { day: string; revenue: number; orders: number }[]; field: 'revenue' | 'orders' }) {
  const t = useShopT()
  if (!data.length) return <div className="h-20 flex items-center justify-center text-xs text-gray-400">{t.anaNoDataYet}</div>
  const max = Math.max(...data.map(d => d[field]), 0.001)
  return (
    <div className="flex items-end gap-0.5 h-20 w-full">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center">
          <div
            className="w-full rounded-t bg-blue-500 transition-all"
            style={{ height: `${Math.max((d[field] / max) * 70, d[field] > 0 ? 2 : 0)}px` }}
            title={`${d.day.slice(5)}: ${field === 'revenue' ? fmt(d.revenue) : d.orders}`}
          />
        </div>
      ))}
    </div>
  )
}

function statusLabels(t: ShopTranslations): Record<string, { label: string; color: string }> {
  return {
    PENDING:     { label: t.anaStatusPending,    color: 'bg-amber-400' },
    CONFIRMED:   { label: t.anaStatusConfirmed,  color: 'bg-blue-400' },
    PREPARED:    { label: t.anaStatusReady,      color: 'bg-purple-400' },
    IN_DELIVERY: { label: t.anaStatusDelivery,   color: 'bg-orange-400' },
    COMPLETED:   { label: t.anaStatusCompleted,  color: 'bg-green-500' },
    CANCELLED:   { label: t.anaStatusCancelled,  color: 'bg-red-400' },
  }
}

export default function ShopAnalyticsPage() {
  const t = useShopT()
  const STATUS_LABELS = statusLabels(t)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shop/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6 flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6 text-center py-20 text-gray-400">
        {t.anaUnableToLoad}
      </div>
    )
  }

  const totalOrderCount = Object.values(data.orders.byStatus).reduce((a, b) => a + b, 0)

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="h-5 w-5 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t.anaTitle}</h1>
          <p className="text-xs text-gray-500">{t.anaSubtitle}</p>
        </div>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label={t.anaToday}
          value={fmt(data.revenue.today)}
          sub={`${data.revenue.todayOrders} ${t.anaOrdersSuffix}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="blue"
        />
        <KpiCard
          label={t.anaThisWeek}
          value={fmt(data.revenue.week)}
          sub={`${data.revenue.weekOrders} ${t.anaOrdersSuffix}`}
          icon={<BarChart2 className="h-5 w-5" />}
          color="purple"
        />
        <KpiCard
          label={t.anaThisMonth}
          value={fmt(data.revenue.month)}
          sub={`${data.revenue.monthOrders} ${t.anaOrdersSuffix}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
        />
        <KpiCard
          label={t.anaAllTime}
          value={fmt(data.revenue.allTime)}
          sub={`${data.revenue.allTimeOrders} ${t.anaOrdersSuffix}`}
          icon={<Award className="h-5 w-5" />}
          color="orange"
        />
      </div>

      {/* Net earnings */}
      <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold text-green-700">{t.anaNetEarnings}</p>
            <p className="text-2xl font-black text-green-800 mt-0.5">{fmt(data.revenue.net)} BHD</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-600">{t.anaPlatformCommission}</p>
            <p className="text-sm font-bold text-green-700">{fmt(data.revenue.commission)} BHD</p>
          </div>
        </div>
      </div>

      {/* Revenue trend chart */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">{t.anaRevenue30}</p>
        <MiniBar data={data.daily} field="revenue" />
        {data.daily.length > 0 && (
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">{data.daily[0]?.day?.slice(5)}</span>
            <span className="text-[10px] text-gray-400">{data.daily[data.daily.length - 1]?.day?.slice(5)}</span>
          </div>
        )}
      </div>

      {/* Orders chart + status breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">{t.anaOrders30}</p>
          <MiniBar data={data.daily} field="orders" />
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">{t.anaOrderStatus.replace('{count}', String(totalOrderCount))}</p>
          <div className="space-y-2">
            {Object.entries(data.orders.byStatus)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const meta = STATUS_LABELS[status]
                const pct = totalOrderCount > 0 ? Math.round((count / totalOrderCount) * 100) : 0
                return (
                  <div key={status} className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta?.color ?? 'bg-gray-300'}`} />
                    <span className="text-xs text-gray-600 flex-1">{meta?.label ?? status}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 mx-2">
                      <div className={`h-1.5 rounded-full ${meta?.color ?? 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Top products by revenue */}
      {data.topProducts.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <DollarSign className="h-4 w-4 text-green-600" />
            <p className="text-sm font-semibold text-gray-700">{t.anaTopProductsRevenue}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topProducts.map((p, i) => (
              <div key={p.productId ?? i} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-black text-gray-300 w-4">#{i + 1}</span>
                <p className="flex-1 text-sm text-gray-700 truncate min-w-0">{p.name}</p>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{fmt(p.revenue)}</p>
                  <p className="text-xs text-gray-400">{p.qty} {t.anaSold}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top products by views */}
      {data.topByViews.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Package className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-700">{t.anaTopProductsViews}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topByViews.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-black text-gray-300 w-4">#{i + 1}</span>
                <p className="flex-1 text-sm text-gray-700 truncate min-w-0">{p.name}</p>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{p.views} {t.anaViews}</p>
                  <p className="text-xs text-gray-400">{p.salesCount} {t.anaSales}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customers */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label={t.anaTotalCustomers}
          value={String(data.customers.total)}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <KpiCard
          label={t.anaNew30}
          value={String(data.customers.newThisMonth)}
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Recent sales */}
      {data.recentSales.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-700">{t.anaRecentSales}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentSales.map((o) => (
              <div key={o.orderNumber} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-bold text-gray-900">#{o.orderNumber}</p>
                  <p className="text-xs text-gray-400 truncate">{o.customerName ?? t.anaGuest}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 shrink-0">{fmt(Number(o.grandTotal))} {o.currency}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free plan badge */}
      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-center">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">{t.anaAdvancedAnalytics}</p>
        <p className="text-xs text-blue-500 mt-1">{t.anaFreePlanBadge}</p>
      </div>
    </div>
  )
}
