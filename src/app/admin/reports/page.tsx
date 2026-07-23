'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, ShoppingCart, Users, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Summary { orderCount: number; revenue: number; newCustomers: number }
interface DayData { day: string; count: number; revenue: number }
interface ProductData { productId: string; name: string; revenue: number; qty: number }
interface CatData { category: string; revenue: number }
interface Report { summary: Summary; ordersByDay: DayData[]; topProducts: ProductData[]; categoryRevenue: CatData[] }

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316', '#6366f1']

const RANGES = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '1 year', value: '365' },
]

export default function ReportsPage() {
  const [range, setRange] = useState('30')
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const res = await fetch(`/api/admin/reports?range=${range}`, { signal: ctrl.signal })
      clearTimeout(timer)
      if (res.ok) {
        setData(await res.json())
      } else {
        setError(true)
      }
    } catch {
      clearTimeout(timer)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { load() }, [load])

  const fmtBhd = (n: number) => `${n.toFixed(3)} BHD`

  const isEmpty = data &&
    data.summary.orderCount === 0 &&
    data.ordersByDay.length === 0 &&
    data.topProducts.length === 0

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Reports & Analytics</h1>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {RANGES.map((r) => (
            <div
              key={r.value}
              role="button"
              onPointerDown={(e) => { e.preventDefault(); setRange(r.value) }}
              style={{ touchAction: 'manipulation', cursor: 'pointer', userSelect: 'none' }}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors select-none ${
                range === r.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          Failed to load report data. Please try refreshing.
        </div>
      )}

      {!loading && !error && isEmpty && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No data yet for this period</p>
          <p className="mt-1 text-xs text-gray-400">Start creating orders to see reports here.</p>
        </div>
      )}

      {!loading && !error && data && !isEmpty && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{data.summary.orderCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtBhd(data.summary.revenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">New Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{data.summary.newCustomers}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue over time */}
          {data.ordersByDay.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-gray-900">Revenue Over Time</h2>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.ordersByDay} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                    <Tooltip formatter={(v) => [typeof v === 'number' ? `${v.toFixed(3)} BHD` : v, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top products chart */}
            {data.topProducts.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <h2 className="mb-4 text-sm font-semibold text-gray-900">Top Products by Revenue</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.topProducts} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}`} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 9 }}
                        width={100}
                        tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '…' : v}
                      />
                      <Tooltip formatter={(v) => [typeof v === 'number' ? `${v.toFixed(3)} BHD` : v, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Category pie */}
            {data.categoryRevenue.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <h2 className="mb-4 text-sm font-semibold text-gray-900">Revenue by Category</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.categoryRevenue}
                        dataKey="revenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        label={({ category, percent }: any) =>
                          `${String(category ?? '').slice(0, 10)} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {data.categoryRevenue.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(3)} BHD` : v} />
                      <Legend formatter={(value: string) => value.slice(0, 16)} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top products table */}
          {data.topProducts.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="px-4 pt-4 pb-2">
                  <h2 className="text-sm font-semibold text-gray-900">Top Products Detail</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Product</th>
                        <th className="px-4 py-2 text-right font-medium">Units</th>
                        <th className="px-4 py-2 text-right font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.topProducts.map((p, idx) => (
                        <tr key={p.productId ?? idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{p.qty}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtBhd(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
