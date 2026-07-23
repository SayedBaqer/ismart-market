'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, Download, Check } from 'lucide-react'

type DocStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'

const STATUS_COLORS: Record<DocStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  sent: 'info',
  paid: 'success',
  partial: 'warning',
  overdue: 'danger',
  cancelled: 'default',
}

const STATUS_OPTIONS: DocStatus[] = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled']

interface DocItem {
  id: string
  name: string
  sku: string | null
  description: string | null
  qty: number
  unitPrice: number
  discountPct: number
  taxPct: number
  lineTotal: number
  serial: string | null
  warranty: string | null
}

interface Payment {
  id: string
  amount: number
  method: string
  reference: string | null
  paidAt: string
}

interface Document {
  id: string
  docType: string
  docNumber: string | null
  status: DocStatus
  issueDate: string
  dueDate: string | null
  grandTotal: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  amountPaid: number
  currency: string
  notes: string | null
  terms: string | null
  customer: { id: string; displayName: string; mobile: string; email: string | null } | null
  createdBy: { name: string | null; email: string } | null
  items: DocItem[]
  payments: Payment[]
}

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<DocStatus>('draft')
  const [saving, setSaving] = useState(false)

  // Payment form
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'bank' | 'card' | 'other'>('cash')
  const [payRef, setPayRef] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/documents/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setDoc(d)
        setStatus(d.status)
        setLoading(false)
      })
  }, [id])

  async function reload() {
    const res = await fetch(`/api/admin/documents/${id}`)
    if (res.ok) {
      const d = await res.json()
      setDoc(d)
      setStatus(d.status)
    }
  }

  async function recordPayment() {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    setPayLoading(true)
    await fetch(`/api/admin/documents/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, method: payMethod, reference: payRef || undefined }),
    })
    setPayAmount('')
    setPayRef('')
    setShowPayForm(false)
    setPayLoading(false)
    reload()
  }

  async function updateStatus() {
    if (!doc || status === doc.status) return
    setSaving(true)
    const res = await fetch(`/api/admin/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setDoc((d) => d ? { ...d, status: updated.status } : d)
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Loading…</div>
  }
  if (!doc) {
    return <div className="p-6 text-sm text-red-500">Document not found.</div>
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/billing" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{doc.docNumber ?? 'Draft'}</h1>
            <p className="text-xs text-gray-400">{doc.docType.replace('_', ' ')}</p>
          </div>
          <Badge variant={STATUS_COLORS[doc.status] ?? 'default'}>{doc.status}</Badge>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <a
            href={`/api/admin/documents/${id}/pdf`}
            download
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </a>
        </div>
      </div>

      {/* Meta */}
      <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-400">Customer</p>
          <p className="mt-0.5 font-medium text-gray-900">{doc.customer?.displayName ?? '—'}</p>
          {doc.customer?.mobile && <p className="text-xs text-gray-500">{doc.customer.mobile}</p>}
          {doc.customer?.email && <p className="text-xs text-gray-500">{doc.customer.email}</p>}
        </div>
        <div>
          <p className="text-xs text-gray-400">Issue Date</p>
          <p className="mt-0.5 font-medium text-gray-900">
            {new Date(doc.issueDate).toLocaleDateString('en-GB')}
          </p>
          {doc.dueDate && (
            <>
              <p className="mt-2 text-xs text-gray-400">Due Date</p>
              <p className="mt-0.5 font-medium text-gray-900">
                {new Date(doc.dueDate).toLocaleDateString('en-GB')}
              </p>
            </>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DocStatus)}
              className="h-8 flex-1 rounded-lg border border-gray-200 px-2 text-xs"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {status !== doc.status && (
              <Button size="sm" isLoading={saving} onClick={updateStatus}>
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
              <th className="px-4 py-3 text-left font-medium">Item</th>
              <th className="px-4 py-3 text-center font-medium w-16">Qty</th>
              <th className="px-4 py-3 text-right font-medium w-24">Unit Price</th>
              <th className="px-4 py-3 text-center font-medium w-16">Disc %</th>
              <th className="px-4 py-3 text-center font-medium w-16">Tax %</th>
              <th className="px-4 py-3 text-right font-medium w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {doc.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                  {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  {item.serial && <p className="text-xs text-gray-400">S/N: {item.serial}</p>}
                  {item.warranty && <p className="text-xs text-gray-400">Warranty: {item.warranty}</p>}
                </td>
                <td className="px-4 py-3 text-center text-gray-700">{item.qty}</td>
                <td className="px-4 py-3 text-right text-gray-700">{Number(item.unitPrice).toFixed(3)}</td>
                <td className="px-4 py-3 text-center text-gray-500">{item.discountPct > 0 ? `${item.discountPct}%` : '—'}</td>
                <td className="px-4 py-3 text-center text-gray-500">{item.taxPct > 0 ? `${item.taxPct}%` : '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {Number(item.lineTotal).toFixed(3)} {doc.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{Number(doc.subtotal).toFixed(3)} {doc.currency}</span>
            </div>
            {Number(doc.discountTotal) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>− {Number(doc.discountTotal).toFixed(3)} {doc.currency}</span>
              </div>
            )}
            {Number(doc.taxTotal) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span>+ {Number(doc.taxTotal).toFixed(3)} {doc.currency}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900">
              <span>Grand Total</span>
              <span>{Number(doc.grandTotal).toFixed(3)} {doc.currency}</span>
            </div>
            {Number(doc.amountPaid) > 0 && (
              <div className="flex justify-between text-green-600 text-sm pt-1">
                <span>Paid</span>
                <span>{Number(doc.amountPaid).toFixed(3)} {doc.currency}</span>
              </div>
            )}
            {Number(doc.amountPaid) > 0 && Number(doc.amountPaid) < Number(doc.grandTotal) && (
              <div className="flex justify-between font-semibold text-orange-600 text-sm">
                <span>Balance Due</span>
                <span>{(Number(doc.grandTotal) - Number(doc.amountPaid)).toFixed(3)} {doc.currency}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Payments Received</h2>
          {doc.status !== 'paid' && doc.status !== 'cancelled' && (
            <button
              onClick={() => setShowPayForm((v) => !v)}
              className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              + Record Payment
            </button>
          )}
        </div>

        {showPayForm && (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Amount ({doc.currency})</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.000"
                className="h-9 w-32 rounded-lg border border-gray-200 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Reference</label>
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Cheque/transfer ref…"
                className="h-9 w-36 rounded-lg border border-gray-200 px-3 text-sm"
              />
            </div>
            <Button size="sm" isLoading={payLoading} onClick={recordPayment}>Save</Button>
            <Button variant="outline" size="sm" onClick={() => setShowPayForm(false)}>Cancel</Button>
          </div>
        )}

        {doc.payments.length === 0 ? (
          <p className="text-xs text-gray-400">No payments recorded yet</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-left font-medium">Method</th>
                <th className="pb-2 text-left font-medium">Reference</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {doc.payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 text-gray-600">{new Date(p.paidAt).toLocaleDateString('en-GB')}</td>
                  <td className="py-2 text-gray-600 capitalize">{p.method}</td>
                  <td className="py-2 text-gray-400">{p.reference ?? '—'}</td>
                  <td className="py-2 text-right font-semibold text-green-600">
                    {Number(p.amount).toFixed(3)} {doc.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Notes */}
      {(doc.notes || doc.terms) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {doc.notes && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="mb-1 text-xs font-semibold text-gray-500">Notes</p>
              <p className="text-sm text-gray-700">{doc.notes}</p>
            </div>
          )}
          {doc.terms && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="mb-1 text-xs font-semibold text-gray-500">Terms & Conditions</p>
              <p className="text-sm text-gray-700">{doc.terms}</p>
            </div>
          )}
        </div>
      )}

      {doc.createdBy && (
        <p className="text-xs text-gray-400">Created by {doc.createdBy.name ?? doc.createdBy.email}</p>
      )}
    </div>
  )
}
