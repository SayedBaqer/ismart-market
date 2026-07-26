'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Search, Plus, Phone, Mail, ShoppingCart, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useShopT } from '@/components/shop/lang-provider'

interface Customer {
  id: string
  displayName: string
  mobile: string
  email: string | null
  billingAddress: string | null
  notes: string | null
  createdAt: string
  _count: { orders: number }
}

export default function ShopCustomersPage() {
  const t = useShopT()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ displayName: '', mobile: '', email: '', phone: '', billingAddress: '', notes: '' })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('q', search)
      const res = await fetch(`/api/shop/customers?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers ?? [])
        setTotalPages(data.pages ?? 1)
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  async function addCustomer() {
    if (!form.displayName.trim() || !form.mobile.trim()) {
      setError(t.custNameMobileRequired)
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/shop/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ displayName: '', mobile: '', email: '', phone: '', billingAddress: '', notes: '' })
      await load()
    } else {
      const data = await res.json()
      setError(data.error ?? t.custSaveFailed)
    }
    setSaving(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t.custTitle}</h1>
            <p className="text-xs text-gray-500">{t.custCountInShop.replace('{count}', String(total))}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t.custAddCustomer}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-blue-900">{t.custNewCustomer}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'displayName', label: t.custFullName, placeholder: 'John Doe' },
              { key: 'mobile', label: t.custMobile, placeholder: '+973 3X XXX XXX' },
              { key: 'email', label: t.custEmail, placeholder: 'john@example.com' },
              { key: 'phone', label: t.custAltPhone, placeholder: '+973 1X XXX XXX' },
              { key: 'billingAddress', label: t.custAddress, placeholder: 'Building, Road, Block, City' },
              { key: 'notes', label: t.custNotes, placeholder: t.custNotesPlaceholder },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-600">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={addCustomer} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? t.custSaving : t.custSaveCustomer}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3">
              {t.custCancel}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.custSearchPlaceholder}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button type="button" onClick={load} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Users className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500">{search ? t.custNoMatch : t.custNoneYet}</p>
          {!search && (
            <button type="button" onClick={() => setShowForm(true)} className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> {t.custAddCustomer}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-sm text-blue-700">
                {c.displayName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{c.displayName}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="h-3 w-3" />{c.mobile}</span>
                  {c.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail className="h-3 w-3" />{c.email}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <ShoppingCart className="h-3 w-3" />
                  {c._count.orders} {c._count.orders !== 1 ? t.custOrders : t.custOrder}
                </span>
                <span className="text-[10px] text-gray-300">
                  {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">{t.custPageOf.replace('{page}', String(page)).replace('{total}', String(totalPages))}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
