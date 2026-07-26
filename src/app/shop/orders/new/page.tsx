'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useShopT } from '@/components/shop/lang-provider'

interface Product { id: string; name: string; sku: string; price: number }
interface Customer { id: string; displayName: string; mobile: string }

interface LineItem {
  id: string
  productId: string
  name: string
  sku: string
  qty: string
  unitPrice: string
}

function newLine(): LineItem {
  return { id: Math.random().toString(36).slice(2), productId: '', name: '', sku: '', qty: '1', unitPrice: '0' }
}

const inputCls = 'h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function NewOrderPage() {
  const t = useShopT()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [items, setItems] = useState<LineItem[]>([newLine()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/shop/products?pageSize=200').then((r) => r.ok ? r.json() : { items: [] }),
      fetch('/api/shop/customers').then((r) => r.ok ? r.json() : { customers: [] }),
    ]).then(([pRes, cRes]) => {
      setProducts(Array.isArray(pRes.items) ? pRes.items : [])
      setCustomers(Array.isArray(cRes.customers) ? cRes.customers : [])
    }).catch(() => {}).finally(() => setLoadingData(false))
  }, [])

  function updateItem(id: string, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it))
  }

  function selectProduct(lineId: string, productId: string) {
    const p = products.find((p) => p.id === productId)
    if (!p) { updateItem(lineId, 'productId', productId); return }
    setItems((prev) => prev.map((it) =>
      it.id === lineId ? { ...it, productId: p.id, name: p.name, sku: p.sku, unitPrice: String(p.price) } : it,
    ))
  }

  const grandTotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter((i) => i.name.trim())
    if (validItems.length === 0) { setError(t.ordAddAtLeastOneItem); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          customerName: customerName || undefined,
          customerMobile: customerMobile || undefined,
          notes: notes || undefined,
          items: validItems.map((i) => ({
            productId: i.productId || undefined,
            name: i.name,
            sku: i.sku || undefined,
            qty: parseFloat(i.qty) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
          })),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? t.ordCreateFailed)
        return
      }
      const d = await res.json()
      router.push(`/shop/orders/${d.order.id}`)
    } catch {
      setError(t.ordNetworkError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="p-4 md:p-6 space-y-5 max-w-3xl pb-24 md:pb-10">
      <div className="flex items-center gap-3">
        <Link href="/shop/orders" className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">{t.ordNewOrder}</h1>
      </div>

      {/* Customer */}
      <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div>
          <label className={labelCls}>{t.ordExistingCustomer}</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputCls}
            disabled={loadingData}
          >
            <option value="">{t.ordWalkInCustomer}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName} ({c.mobile})</option>
            ))}
          </select>
        </div>
        {!customerId && (
          <>
            <div>
              <label className={labelCls}>{t.ordCustomerName}</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} placeholder={t.ordOptional} />
            </div>
            <div>
              <label className={labelCls}>{t.ordCustomerMobile}</label>
              <input value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} className={inputCls} placeholder={t.ordOptional} />
            </div>
          </>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">{t.ordItems}</h2>
          <span className="text-xs text-gray-400">{items.length}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <div key={item.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t.ordItem} {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  disabled={items.length === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className={labelCls}>{t.ordProduct}</label>
                <select value={item.productId} onChange={(e) => selectProduct(item.id, e.target.value)} className={inputCls} disabled={loadingData}>
                  <option value="">{t.ordCustomItem}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t.ordItemName}</label>
                <input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className={inputCls} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t.ordQty}</label>
                  <input type="number" min="0" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t.ordUnitPrice}</label>
                  <input type="number" min="0" step="0.001" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">{t.ordLineTotal}</span>
                <span className="text-sm font-bold text-gray-900">{((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(3)} BHD</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newLine()])}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 py-3 text-sm font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-colors"
            >
              <Plus className="h-5 w-5" /> {t.ordAddItem}
            </button>
          </div>
          <div className="flex justify-end px-4 pb-4">
            <div className="flex gap-8 font-bold text-gray-900 text-sm">
              <span>{t.ordTotal}</span><span>{grandTotal.toFixed(3)} BHD</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>{t.ordNotes}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end gap-3">
        <Link href="/shop/orders" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">{t.ordCancel}</Link>
        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? t.ordSaving : t.ordSaveOrder}
        </button>
      </div>
    </form>
  )
}
