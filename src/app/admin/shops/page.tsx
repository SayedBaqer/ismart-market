'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Plus, Search, CheckCircle2, XCircle, Clock,
  Package, ShoppingCart, Users, ChevronLeft, ChevronRight,
  Crown, Zap, TrendingUp, ExternalLink, Filter, RefreshCw,
  AlertTriangle, X,
} from 'lucide-react'

type ShopStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
type ShopPlan = 'FREE' | 'STARTER' | 'BUSINESS' | 'ENTERPRISE'

interface Shop {
  id: string; name: string; slug: string; email: string | null; phone: string | null
  status: ShopStatus; plan: ShopPlan; currency: string; createdAt: string; logoUrl: string | null
  _count: { products: number; orders: number; users: number }
}

const STATUS_META: Record<ShopStatus, { label: string; cls: string; dot: string; Icon: React.ComponentType<{ className?: string }> }> = {
  PENDING:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500',  Icon: Clock },
  ACTIVE:    { label: 'Active',    cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  Icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspended', cls: 'bg-red-100 text-red-700',     dot: 'bg-red-500',    Icon: XCircle },
  CLOSED:    { label: 'Closed',    cls: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400',   Icon: XCircle },
}

const PLAN_META: Record<ShopPlan, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  FREE:       { label: 'Free',       cls: 'text-gray-500 bg-gray-100',    Icon: Users },
  STARTER:    { label: 'Starter',    cls: 'text-blue-600 bg-blue-50',     Icon: Zap },
  BUSINESS:   { label: 'Business',   cls: 'text-violet-600 bg-violet-50', Icon: TrendingUp },
  ENTERPRISE: { label: 'Enterprise', cls: 'text-amber-600 bg-amber-50',   Icon: Crown },
}

const EMPTY = { name: '', slug: '', email: '', phone: '', address: '', description: '', currency: 'BHD', language: 'en' }

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (q) params.set('q', q)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/admin/shops?${params}`)
    if (res.ok) {
      const d = await res.json()
      setShops(d.shops)
      setTotal(d.total)
      setPages(d.pages)
    }
    setLoading(false)
  }, [page, q, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [q, statusFilter])

  async function changeStatus(id: string, status: ShopStatus) {
    setActing(id)
    await fetch(`/api/admin/shops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
    setActing(null)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/admin/shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setForm(EMPTY); setShowForm(false); load() }
    else { const d = await res.json(); setError(d.error ?? 'Failed to create') }
    setSaving(false)
  }

  const counts = {
    total,
    active: shops.filter((s) => s.status === 'ACTIVE').length,
    pending: shops.filter((s) => s.status === 'PENDING').length,
  }

  return (
    <div className="min-h-full bg-gray-50/30">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Shops</h1>
            <p className="text-xs text-gray-500 mt-0.5">{total} shop{total !== 1 ? 's' : ''} on the platform</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/platform"
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <TrendingUp className="h-3.5 w-3.5" /> Platform Overview
            </Link>
            <button type="button" onClick={() => { setShowForm(true); setError('') }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> New Shop
            </button>
          </div>
        </div>

        {/* Status pills */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {([
            { key: '', label: 'All Shops', count: total },
            { key: 'PENDING', label: 'Pending', count: counts.pending },
            { key: 'ACTIVE', label: 'Active', count: counts.active },
            { key: 'SUSPENDED', label: 'Suspended', count: 0 },
            { key: 'CLOSED', label: 'Closed', count: 0 },
          ] as const).map(({ key, label, count }) => (
            <button key={key} type="button" onClick={() => setStatusFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${statusFilter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
              {count > 0 && <span className="ml-1.5 rounded-full bg-white/20 px-1.5">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mx-auto max-w-2xl p-6">
          <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-blue-50/50">
              <p className="font-semibold text-gray-900">Create New Shop</p>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={create} className="p-5 space-y-4">
              {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'name', label: 'Shop Name *', placeholder: 'My Shop', onChangeFn: (v: string) => ({ name: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }) },
                  { key: 'slug', label: 'Slug *', placeholder: 'my-shop' },
                  { key: 'email', label: 'Email', placeholder: 'shop@example.com' },
                  { key: 'phone', label: 'Phone', placeholder: '+973 3X XXX XXX' },
                  { key: 'address', label: 'Address', placeholder: 'City, Country', colSpan: true },
                ].map(({ key, label, placeholder, onChangeFn, colSpan }) => (
                  <div key={key} className={colSpan ? 'sm:col-span-2' : ''}>
                    <label className="text-xs font-semibold text-gray-600">{label}</label>
                    <input
                      value={form[key as keyof typeof form]}
                      onChange={(e) => {
                        const updates = onChangeFn ? onChangeFn(e.target.value) : { [key]: e.target.value }
                        setForm((f) => ({ ...f, ...updates }))
                      }}
                      placeholder={placeholder}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-600">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    {['BHD', 'SAR', 'AED', 'USD', 'EUR'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Language</label>
                  <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving || !form.name || !form.slug}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Creating…' : <><CheckCircle2 className="h-4 w-4" /> Create Shop</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Search & filter bar */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shops…"
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <button type="button" onClick={load} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-500 hover:bg-gray-50">
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-500">No shops found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => {
              const sm = STATUS_META[s.status]
              const pm = PLAN_META[s.plan]
              const StatusIcon = sm.Icon
              const PlanIcon = pm.Icon
              return (
                <div key={s.id} className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                  {/* Status dot top-right */}
                  <div className={`absolute top-3 right-3 h-2.5 w-2.5 rounded-full ${sm.dot} ring-2 ring-white`} />

                  {/* Card header */}
                  <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-lg font-black text-blue-700 shadow-sm">
                      {s.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logoUrl} alt={s.name} className="h-full w-full rounded-xl object-cover" />
                      ) : s.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-bold text-gray-900 truncate">{s.name}</p>
                      <p className="font-mono text-xs text-gray-400 truncate">/{s.slug}</p>
                      {s.email && <p className="text-xs text-gray-400 truncate mt-0.5">{s.email}</p>}
                    </div>
                  </div>

                  {/* Status + Plan badges */}
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${sm.cls}`}>
                      <StatusIcon className="h-3 w-3" />{sm.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${pm.cls}`}>
                      <PlanIcon className="h-3 w-3" />{pm.label}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
                    {[
                      { icon: Package, value: s._count.products, label: 'Products' },
                      { icon: ShoppingCart, value: s._count.orders, label: 'Orders' },
                      { icon: Users, value: s._count.users, label: 'Staff' },
                    ].map(({ icon: Icon, value, label }) => (
                      <div key={label} className="flex flex-col items-center py-3">
                        <Icon className="h-3.5 w-3.5 text-gray-400 mb-1" />
                        <p className="text-sm font-extrabold text-gray-900">{value}</p>
                        <p className="text-[10px] text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Action footer */}
                  <div className="flex items-center gap-1.5 border-t border-gray-100 px-3 py-2.5 bg-gray-50/50">
                    <Link href={`/admin/shops/${s.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                      Manage
                    </Link>
                    <a href={`/shops/${s.slug}`} target="_blank" rel="noopener noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors">
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    {/* Context action */}
                    {s.status === 'PENDING' && (
                      <button type="button" disabled={acting === s.id} onClick={() => changeStatus(s.id, 'ACTIVE')}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        <CheckCircle2 className="h-3 w-3" />
                        {acting === s.id ? '…' : 'Approve'}
                      </button>
                    )}
                    {s.status === 'ACTIVE' && (
                      <button type="button" disabled={acting === s.id} onClick={() => changeStatus(s.id, 'SUSPENDED')}
                        className="flex items-center gap-1 rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-50">
                        <AlertTriangle className="h-3 w-3" />
                        {acting === s.id ? '…' : 'Suspend'}
                      </button>
                    )}
                    {s.status === 'SUSPENDED' && (
                      <button type="button" disabled={acting === s.id} onClick={() => changeStatus(s.id, 'ACTIVE')}
                        className="flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                        <CheckCircle2 className="h-3 w-3" />
                        {acting === s.id ? '…' : 'Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-500">{total} shops · page {page} of {pages}</p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page === pages}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
