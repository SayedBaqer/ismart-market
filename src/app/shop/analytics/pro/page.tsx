'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, AlertTriangle, Layers, Sparkles, Lock } from 'lucide-react'
import Link from 'next/link'
import { useShopT } from '@/components/shop/lang-provider'

interface TrendPoint { day: string; revenue: number; orders: number }
interface CategoryRow { category: string; revenue: number }
interface ForecastRow { id: string; name: string; sku: string; currentQty: number; dailyRate: number; daysLeft: number }

interface ProData {
  trend: TrendPoint[]
  repeatRate: number
  totalCustomers: number
  repeatCustomers: number
  topCategories: CategoryRow[]
  forecast: ForecastRow[]
}

// Validated categorical slot 1 (blue) — single-hue since each mark carries a direct label, not a legend
const BLUE = '#2a78d6'
const BLUE_FILL = '#9ec5f4'

export default function ProStatisticsPage() {
  const t = useShopT()
  const [data, setData] = useState<ProData | null>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/shop/analytics/pro').then(async (res) => {
      if (res.status === 402 || res.status === 403) {
        const d = await res.json()
        setLocked(true)
        setError(d.error ?? t.proNotAvailable)
        setLoading(false)
        return
      }
      if (!res.ok) { setError(t.proFailedToLoad); setLoading(false); return }
      setData(await res.json())
      setLoading(false)
    }).catch(() => { setError(t.proFailedToLoad); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
  }

  if (locked || !data) {
    return (
      <div className="p-6 max-w-md mx-auto text-center py-20">
        <Lock className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h1 className="text-lg font-bold text-gray-900">{t.proTitle}</h1>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
        <Link href="/shop/plugins" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          {t.proViewPlugins}
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t.proTitle}</h1>
          <p className="text-xs text-gray-500">{t.proLast30Days}</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400"><Users className="h-4 w-4" /><span className="text-xs font-medium">{t.proRepeatCustomers}</span></div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{data.repeatRate}%</p>
          <p className="text-xs text-gray-400">{t.proOfCustomers.replace('{repeat}', String(data.repeatCustomers)).replace('{total}', String(data.totalCustomers))}</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-medium">{t.proRestockSoon}</span></div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{data.forecast.length}</p>
          <p className="text-xs text-gray-400">{t.proUnderDaysStock}</p>
        </div>
      </div>

      {/* Sales trend */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-semibold text-gray-900">{t.proSalesTrend}</p>
        </div>
        {data.trend.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">{t.proNoOrdersPeriod}</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="proRevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(value, name) => [name === 'revenue' ? `${Number(value).toFixed(3)} BHD` : value, name === 'revenue' ? t.proRevenue : t.proOrders]}
                contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke={BLUE} strokeWidth={2} fill="url(#proRevGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top categories */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-900">{t.proTopCategoriesRevenue}</p>
          </div>
          {data.topCategories.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t.proNoCategorySales}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topCategories} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 11, fill: '#52514e' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} BHD`, t.proRevenue]} contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9', fontSize: 12 }} />
                <Bar dataKey="revenue" fill={BLUE_FILL} stroke={BLUE} strokeWidth={1} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low stock forecast */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold text-gray-900">{t.proLowStockForecast}</p>
          </div>
          {data.forecast.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t.proNothingLow}</p>
          ) : (
            <div className="space-y-2">
              {data.forecast.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">{t.proLeftSellingRate.replace('{qty}', String(f.currentQty)).replace('{rate}', String(f.dailyRate))}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    f.daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {t.proDaysLeftShort.replace('{days}', String(f.daysLeft))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
