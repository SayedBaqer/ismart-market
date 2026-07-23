'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const DOC_TYPES = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'ESTIMATE', label: 'Estimate / Quote' },
  { value: 'SALES_ORDER', label: 'Sales Order' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
] as const
type DocType = typeof DOC_TYPES[number]['value']

const WARRANTY_PRESETS = [
  { label: 'No warranty', value: '' },
  { label: '3 months', value: '3 months' },
  { label: '6 months', value: '6 months' },
  { label: '1 year', value: '1 year' },
  { label: '2 years', value: '2 years' },
  { label: '3 years', value: '3 years' },
  { label: 'Custom…', value: '__custom__' },
]

interface LineItem {
  id: string
  productId: string
  name: string
  sku: string
  description: string
  qty: string
  unitPrice: string
  discountPct: string
  taxPct: string
  serial: string
  warrantyPreset: string  // value from WARRANTY_PRESETS or '__custom__'
  warrantyCustom: string  // used when preset = '__custom__'
}

interface Customer { id: string; displayName: string; mobile: string }
interface Product { id: string; name: string; sku: string; price: number }

function newLine(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    productId: '', name: '', sku: '', description: '',
    qty: '1', unitPrice: '0', discountPct: '0', taxPct: '0',
    serial: '', warrantyPreset: '', warrantyCustom: '',
  }
}

function effectiveWarranty(item: LineItem): string {
  if (item.warrantyPreset === '__custom__') return item.warrantyCustom
  return item.warrantyPreset
}

function calcLine(item: LineItem) {
  const qty = parseFloat(item.qty) || 0
  const up = parseFloat(item.unitPrice) || 0
  const disc = parseFloat(item.discountPct) || 0
  const tax = parseFloat(item.taxPct) || 0
  const base = qty * up
  const afterDisc = base - base * (disc / 100)
  return afterDisc + afterDisc * (tax / 100)
}

const inputCls = 'h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function NewDocPage() {
  const router = useRouter()
  const [docType, setDocType] = useState<DocType>('INVOICE')
  const [customerId, setCustomerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [items, setItems] = useState<LineItem[]>([newLine()])
  const [saving, setSaving] = useState(false)
  const [savingTerms, setSavingTerms] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [savedTerms, setSavedTerms] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/customers?pageSize=200').then((r) => r.ok ? r.json() : { customers: [] }),
      fetch('/api/products?pageSize=200').then((r) => r.ok ? r.json() : { items: [] }),
      fetch('/api/admin/settings').then((r) => r.ok ? r.json() : {}),
    ]).then(([cRes, pRes, settings]) => {
      setCustomers(Array.isArray(cRes.customers) ? cRes.customers : [])
      setProducts(Array.isArray(pRes.items) ? pRes.items : [])
      const t = settings['document.terms.default'] ?? ''
      setSavedTerms(t)
      if (t && !terms) setTerms(t)
    }).catch(() => {}).finally(() => setLoadingData(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateItem(id: string, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  function selectProduct(lineId: string, productId: string) {
    const p = products.find((p) => p.id === productId)
    if (!p) {
      updateItem(lineId, 'productId', productId)
      return
    }
    setItems((prev) => prev.map((item) =>
      item.id === lineId
        ? { ...item, productId: p.id, name: p.name, sku: p.sku, unitPrice: String(p.price) }
        : item,
    ))
  }

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0)
  const grandTotal = items.reduce((s, i) => s + calcLine(i), 0)

  async function saveDefaultTerms() {
    if (!terms.trim()) return
    setSavingTerms(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'document.terms.default': terms }),
      })
      setSavedTerms(terms)
    } finally {
      setSavingTerms(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter((i) => i.name.trim())
    if (validItems.length === 0) { setError('Add at least one item'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          customerId: customerId || undefined,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
          terms: terms || undefined,
          items: validItems.map((i) => ({
            productId: i.productId || undefined,
            name: i.name,
            sku: i.sku || undefined,
            description: i.description || undefined,
            qty: parseFloat(i.qty) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
            discountPct: parseFloat(i.discountPct) || 0,
            taxPct: parseFloat(i.taxPct) || 0,
            serial: i.serial || undefined,
            warranty: effectiveWarranty(i) || undefined,
          })),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to create document')
        return
      }
      const doc = await res.json()
      router.push(`/admin/billing/${doc.id}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="p-4 sm:p-6 space-y-5 max-w-5xl pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/billing" className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">New Document</h1>
      </div>

      {/* Doc meta */}
      <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <label className={labelCls}>Document Type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value as DocType)} className={inputCls}>
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Customer</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputCls}
            disabled={loadingData}
          >
            <option value="">— No customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName} ({c.mobile})</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Items</h2>
          <span className="text-xs text-gray-400">{items.length} line{items.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <div key={item.id} className="p-4 space-y-3">
              {/* Item header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Item {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  disabled={items.length === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Product */}
              <div>
                <label className={labelCls}>Product (optional)</label>
                <select
                  value={item.productId}
                  onChange={(e) => selectProduct(item.id, e.target.value)}
                  className={inputCls}
                  disabled={loadingData}
                >
                  <option value="">Custom item</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>
                  ))}
                </select>
              </div>

              {/* Name + description */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Item Name *</label>
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Name"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Optional"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Qty + Price + Disc + Tax */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className={labelCls}>Qty</label>
                  <input type="number" min="0" value={item.qty}
                    onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Unit Price</label>
                  <input type="number" min="0" step="0.001" value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Disc %</label>
                  <input type="number" min="0" max="100" value={item.discountPct}
                    onChange={(e) => updateItem(item.id, 'discountPct', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tax %</label>
                  <input type="number" min="0" max="100" value={item.taxPct}
                    onChange={(e) => updateItem(item.id, 'taxPct', e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Serial + Warranty */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Serial Number (optional)</label>
                  <input
                    value={item.serial}
                    onChange={(e) => updateItem(item.id, 'serial', e.target.value)}
                    placeholder="Leave empty if none"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Warranty</label>
                  <select
                    value={item.warrantyPreset}
                    onChange={(e) => updateItem(item.id, 'warrantyPreset', e.target.value)}
                    className={inputCls}
                  >
                    {WARRANTY_PRESETS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                  {item.warrantyPreset === '__custom__' && (
                    <input
                      value={item.warrantyCustom}
                      onChange={(e) => updateItem(item.id, 'warrantyCustom', e.target.value)}
                      placeholder="e.g. 18 months"
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>
              </div>

              {/* Line total */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">Line total</span>
                <span className="text-sm font-bold text-gray-900">{calcLine(item).toFixed(3)} BHD</span>
              </div>
            </div>
          ))}
        </div>

        {/* Add item + totals */}
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newLine()])}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 py-3 text-sm font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-colors"
            >
              <Plus className="h-5 w-5" /> Add Another Item
            </button>
          </div>
          <div className="flex justify-end gap-8 px-4 pb-4 text-sm">
            <div className="space-y-1 text-right">
              <div className="flex gap-8 text-xs text-gray-500">
                <span>Subtotal</span><span>{subtotal.toFixed(3)} BHD</span>
              </div>
              <div className="flex gap-8 font-bold text-gray-900">
                <span>Total</span><span>{grandTotal.toFixed(3)} BHD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Notes for the customer…"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls.replace('mb-1', '')}>Terms & Conditions</label>
            <div className="flex gap-2">
              {savedTerms && savedTerms !== terms && (
                <button
                  type="button"
                  onClick={() => setTerms(savedTerms)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Use saved
                </button>
              )}
              {terms.trim() && terms !== savedTerms && (
                <button
                  type="button"
                  onClick={saveDefaultTerms}
                  disabled={savingTerms}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <Save className="h-3 w-3" />
                  {savingTerms ? 'Saving…' : 'Save as default'}
                </button>
              )}
            </div>
          </div>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Payment terms, return policy…"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end gap-3">
        <Link href="/admin/billing">
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
        <Button type="submit" isLoading={saving}>Save Document</Button>
      </div>
    </form>
  )
}
