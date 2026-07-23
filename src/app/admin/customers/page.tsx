'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Search, Plus, X, Check, Eye, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Customer {
  id: string
  displayName: string
  mobile: string
  email: string | null
  billingAddress: string | null
  isSupplier: boolean
  _count: { orders: number; documents: number }
}

const EMPTY = {
  displayName: '',
  mobile: '',
  email: '',
  phone: '',
  billingAddress: '',
  taxNumber: '',
  isSupplier: false,
  notes: '',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (q) params.set('q', q)
      const res = await fetch(`/api/admin/customers?${params}`, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setCustomers(data.customers ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch (e) {
      clearTimeout(timer)
      const msg = e instanceof DOMException && e.name === 'AbortError'
        ? 'Request timed out — check your connection'
        : `Failed to load — ${e instanceof Error ? e.message : 'network error'}`
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [q, page])

  useEffect(() => { load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.displayName.trim() || !form.mobile.trim()) {
      setFormError('Name and mobile are required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setFormError(d.error ?? 'Failed to save')
        return
      }
      setShowForm(false)
      setForm(EMPTY)
      load()
    } catch {
      setFormError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <div className="flex gap-2">
          <div
            role="button"
            onPointerDown={(e) => { e.preventDefault(); load() }}
            style={{ touchAction: 'manipulation', cursor: 'pointer' }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 select-none"
          >
            <RefreshCw className="pointer-events-none h-4 w-4" />
          </div>
          <div
            role="button"
            onPointerDown={(e) => { e.preventDefault(); setShowForm(true); setFormError('') }}
            style={{ touchAction: 'manipulation', cursor: 'pointer' }}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 select-none"
          >
            <Plus className="pointer-events-none h-4 w-4" /> Add
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">New Customer</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{formError}</div>
            )}
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Full Name *" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                <Input label="Mobile *" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input label="Tax Number / CR" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
                <Input label="Address" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isSupplier}
                  onChange={(e) => setForm({ ...form, isSupplier: e.target.checked })}
                  className="rounded"
                />
                Mark as Supplier / Vendor
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" isLoading={saving}>
                  <Check className="h-4 w-4" /> Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1) }}
          placeholder="Search by name, mobile, email…"
          className="h-10 w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-2 text-sm text-gray-400">Loading customers…</p>
            </div>
          ) : loadError ? (
            <div className="py-12 text-center">
              <p className="text-sm text-red-500">{loadError}</p>
              <button type="button" onClick={load} className="mt-3 text-xs text-blue-600 hover:underline">
                Try again
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Contact</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Address</th>
                    <th className="px-4 py-3 text-center font-medium hidden sm:table-cell">Orders</th>
                    <th className="px-4 py-3 text-center font-medium hidden sm:table-cell">Docs</th>
                    <th className="px-4 py-3 text-center font-medium">Type</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.displayName}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{c.mobile}</p>
                        {c.email && <p className="text-xs text-gray-400 hidden sm:block">{c.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{c.billingAddress ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{c._count.orders}</td>
                      <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{c._count.documents}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={c.isSupplier ? 'info' : 'default'}>
                          {c.isSupplier ? 'Supplier' : 'Customer'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/customers/${c.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 ml-auto">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <button type="button" onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">← Prev</button>
          )}
          <span className="flex items-center px-3 text-sm text-gray-500">Page {page} of {pages}</span>
          {page < pages && (
            <button type="button" onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Next →</button>
          )}
        </div>
      )}
    </div>
  )
}
