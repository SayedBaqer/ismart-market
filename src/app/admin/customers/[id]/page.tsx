'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit2, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Order {
  id: string
  orderNumber: string
  status: string
  grandTotal: number
  currency: string
  createdAt: string
}

interface DocSummary {
  id: string
  docType: string
  docNumber: string | null
  status: string
  grandTotal: number
  currency: string
  issueDate: string
}

interface Customer {
  id: string
  displayName: string
  mobile: string
  email: string | null
  phone: string | null
  billingAddress: string | null
  taxNumber: string | null
  isSupplier: boolean
  notes: string | null
  currency: string
  createdAt: string
  _count: { orders: number; documents: number }
  orders: Order[]
  documents: DocSummary[]
}

const ORDER_STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SHIPPED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    mobile: '',
    email: '',
    phone: '',
    billingAddress: '',
    taxNumber: '',
    notes: '',
    isSupplier: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomer(d)
        setForm({
          displayName: d.displayName ?? '',
          mobile: d.mobile ?? '',
          email: d.email ?? '',
          phone: d.phone ?? '',
          billingAddress: d.billingAddress ?? '',
          taxNumber: d.taxNumber ?? '',
          notes: d.notes ?? '',
          isSupplier: d.isSupplier ?? false,
        })
        setLoading(false)
      })
  }, [id])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/admin/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const updated = await res.json()
      setCustomer((c) => c ? { ...c, ...updated } : c)
      setEditing(false)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>
  if (!customer) return <div className="p-6 text-sm text-red-500">Customer not found.</div>

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/customers" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{customer.displayName}</h1>
            <p className="text-xs text-gray-400">
              Customer since {new Date(customer.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
          {customer.isSupplier && <Badge variant="info">Supplier</Badge>}
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" isLoading={saving} onClick={save}>
              <Check className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Contact Info */}
      <Card>
        <CardContent className="py-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Contact Information</h2>
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Display Name', key: 'displayName', required: true },
                { label: 'Mobile', key: 'mobile', required: true },
                { label: 'Email', key: 'email' },
                { label: 'Phone', key: 'phone' },
                { label: 'Tax Number (CR)', key: 'taxNumber' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Billing Address</label>
                <textarea
                  value={form.billingAddress}
                  onChange={(e) => setForm((f) => ({ ...f, billingAddress: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSupplier"
                  checked={form.isSupplier}
                  onChange={(e) => setForm((f) => ({ ...f, isSupplier: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="isSupplier" className="text-sm text-gray-700">Mark as Supplier</label>
              </div>
            </div>
          ) : (
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
              {[
                { label: 'Mobile', value: customer.mobile },
                { label: 'Email', value: customer.email ?? '—' },
                { label: 'Phone', value: customer.phone ?? '—' },
                { label: 'Tax / CR No.', value: customer.taxNumber ?? '—' },
                { label: 'Total Orders', value: customer._count.orders },
                { label: 'Documents', value: customer._count.documents },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
                </div>
              ))}
              {customer.billingAddress && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-400">Billing Address</dt>
                  <dd className="mt-0.5 text-gray-700 whitespace-pre-line">{customer.billingAddress}</dd>
                </div>
              )}
              {customer.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-400">Notes</dt>
                  <dd className="mt-0.5 text-gray-700 whitespace-pre-line">{customer.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Orders</h2>
            <Link
              href={`/admin/orders?customer=${id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {customer.orders.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400">No orders yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Order</th>
                  <th className="px-4 py-2 text-center font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customer.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-600">
                      <Link href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={ORDER_STATUS_COLORS[o.status] ?? 'default'}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {Number(o.grandTotal).toFixed(3)} {o.currency}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      {customer.documents.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Number</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-center font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customer.documents.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-600">
                      <Link href={`/admin/billing/${d.id}`}>{d.docNumber ?? 'Draft'}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{d.docType.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant="default">{d.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {Number(d.grandTotal).toFixed(3)} {d.currency}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {new Date(d.issueDate).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
