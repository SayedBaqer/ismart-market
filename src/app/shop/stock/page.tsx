'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Package, RefreshCw, Search, Save, Tag,
  AlertTriangle, TrendingDown, Globe, PlusCircle, MinusCircle, ListChecks, Boxes,
} from 'lucide-react'
import Link from 'next/link'

interface StockRow {
  id: string
  sku: string
  name: string
  price: number
  comparePrice: number | null
  currentQty: number
  avgCostBhd: number
  threshold: number | null
}

export default function ShopStockPage() {
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [priceEdits, setPriceEdits] = useState<Record<string, { price: string; comparePrice: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove' | 'set'>('add')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustCost, setAdjustCost] = useState('')
  const [adjustBusy, setAdjustBusy] = useState(false)
  const [adjustError, setAdjustError] = useState('')

  const dirtyCount = Object.keys(priceEdits).length

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/shop/stock?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setRows(data.rows ?? [])
    setPriceEdits({})
    setLoading(false)
  }, [q])

  useEffect(() => { load() }, [load])

  function setPrice(id: string, field: 'price' | 'comparePrice', value: string, row: StockRow) {
    setPriceEdits((prev) => ({
      ...prev,
      [id]: {
        price: field === 'price' ? value : (prev[id]?.price ?? String(row.price)),
        comparePrice: field === 'comparePrice' ? value : (prev[id]?.comparePrice ?? String(row.comparePrice ?? '')),
      },
    }))
  }

  async function savePrices() {
    if (dirtyCount === 0) return
    setSaving(true)
    const updates = Object.entries(priceEdits).map(([id, v]) => ({
      id,
      price: parseFloat(v.price) || 0,
      comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : null,
    }))
    const res = await fetch('/api/shop/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (res.ok) {
      setPriceEdits({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      load()
    }
    setSaving(false)
  }

  function openAdjust(rowId: string) {
    setAdjustingId(adjustingId === rowId ? null : rowId)
    setAdjustMode('add')
    setAdjustQty('')
    setAdjustCost('')
    setAdjustError('')
  }

  async function applyAdjust(productId: string) {
    const qty = parseFloat(adjustQty)
    if (!qty || qty <= 0) { setAdjustError('Enter a valid quantity'); return }
    setAdjustBusy(true)
    setAdjustError('')
    const res = await fetch('/api/shop/stock/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: adjustMode,
        productId,
        qty,
        ...(adjustMode === 'add' && adjustCost ? { unitCostBhd: parseFloat(adjustCost) || 0 } : {}),
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      setAdjustError(d.error ?? 'Failed to adjust stock')
      setAdjustBusy(false)
      return
    }
    setAdjustingId(null)
    setAdjustBusy(false)
    load()
  }

  const lowCount = rows.filter((r) => r.threshold != null && r.currentQty <= r.threshold && r.currentQty > 0).length
  const outCount = rows.filter((r) => r.currentQty === 0).length
  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.sku.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="min-h-full bg-gray-50/50 pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Stock & Prices</h1>
            <p className="text-xs text-gray-400">Edit sales prices inline, then tap Save</p>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-sm font-semibold text-emerald-600">Saved!</span>}
            <button
              type="button"
              onClick={savePrices}
              disabled={saving || dirtyCount === 0}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
                dirtyCount > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              } disabled:opacity-60`}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : dirtyCount > 0 ? `Save (${dirtyCount})` : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary chips */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 text-white">
            <p className="text-2xl font-bold">{rows.length}</p>
            <p className="text-xs text-blue-200 mt-0.5">Products</p>
          </div>
          <div className={`rounded-2xl p-3 ${lowCount > 0 ? 'bg-amber-500 text-white' : 'bg-white border border-gray-100'}`}>
            <p className={`text-2xl font-bold ${lowCount > 0 ? 'text-white' : 'text-amber-500'}`}>{lowCount}</p>
            <p className={`text-xs mt-0.5 ${lowCount > 0 ? 'text-amber-100' : 'text-gray-400'}`}>Low Stock</p>
          </div>
          <div className={`rounded-2xl p-3 ${outCount > 0 ? 'bg-red-500 text-white' : 'bg-white border border-gray-100'}`}>
            <p className={`text-2xl font-bold ${outCount > 0 ? 'text-white' : 'text-red-400'}`}>{outCount}</p>
            <p className={`text-xs mt-0.5 ${outCount > 0 ? 'text-red-100' : 'text-gray-400'}`}>Out of Stock</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product or SKU…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Price edit note */}
        {dirtyCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
            <Tag className="h-4 w-4 shrink-0" />
            <span><strong>{dirtyCount}</strong> price{dirtyCount !== 1 ? 's' : ''} changed — tap Save to apply</span>
          </div>
        )}

        {/* Product cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading stock…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="h-12 w-12 mb-3 text-gray-200" />
            <p className="text-sm font-semibold text-gray-500">No products found</p>
            <p className="text-xs mt-1">Add products with stock tracking enabled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((row) => {
              const isOut = row.currentQty === 0
              const isLow = row.threshold != null && row.currentQty <= row.threshold && row.currentQty > 0
              const isDirty = !!priceEdits[row.id]
              const displayPrice = priceEdits[row.id]?.price ?? String(row.price)
              const displayCompare = priceEdits[row.id]?.comparePrice ?? String(row.comparePrice ?? '')

              return (
                <div
                  key={row.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                    isDirty ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'
                  }`}
                >
                  {/* Product name row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isDirty && <Tag className="h-3 w-3 text-blue-500 shrink-0" />}
                        <p className="font-semibold text-gray-900 truncate">{row.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{row.sku}</p>
                    </div>
                    {/* Stock badge */}
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isOut ? <TrendingDown className="h-3 w-3" /> : isLow ? <AlertTriangle className="h-3 w-3" /> : null}
                      {isOut ? 'Out' : isLow ? 'Low' : 'In Stock'}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-end gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Qty</p>
                      <p className={`text-lg font-bold tabular-nums ${isOut ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-gray-800'}`}>
                        {row.currentQty}
                        {row.threshold != null && <span className="text-xs font-normal text-gray-400 ml-1">/{row.threshold}</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Avg Cost</p>
                      <p className="text-sm font-semibold text-gray-700 tabular-nums">
                        {row.avgCostBhd > 0 ? `${row.avgCostBhd.toFixed(3)} BHD` : '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAdjust(row.id)}
                      className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Boxes className="h-3.5 w-3.5" /> Adjust Stock
                    </button>
                  </div>

                  {/* Stock adjustment panel */}
                  {adjustingId === row.id && (
                    <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                      {adjustError && <p className="text-xs text-red-600">{adjustError}</p>}
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { mode: 'add' as const, label: 'Add', icon: PlusCircle },
                          { mode: 'remove' as const, label: 'Remove', icon: MinusCircle },
                          { mode: 'set' as const, label: 'Set exact', icon: ListChecks },
                        ]).map(({ mode, label, icon: Icon }) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setAdjustMode(mode)}
                            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                              adjustMode === mode ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" /> {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          value={adjustQty}
                          onChange={(e) => setAdjustQty(e.target.value)}
                          placeholder={adjustMode === 'set' ? 'New total quantity' : 'Quantity'}
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        {adjustMode === 'add' && (
                          <input
                            type="number"
                            min={0}
                            step={0.001}
                            value={adjustCost}
                            onChange={(e) => setAdjustCost(e.target.value)}
                            placeholder="Unit cost (optional)"
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => applyAdjust(row.id)}
                        disabled={adjustBusy}
                        className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {adjustBusy ? 'Applying…' : 'Apply'}
                      </button>
                    </div>
                  )}

                  {/* Translate link */}
                  <div className="mb-3">
                    <Link href={`/shop/stock/translate/${row.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                      <Globe className="h-3 w-3" /> Add Arabic translation
                    </Link>
                  </div>

                  {/* Price inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Sales Price (BHD)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.001}
                        value={displayPrice}
                        onChange={(e) => setPrice(row.id, 'price', e.target.value, row)}
                        className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                          isDirty ? 'border-blue-300 bg-white' : 'border-gray-200 bg-gray-50'
                        }`}
                        style={{ touchAction: 'manipulation' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Compare Price (optional)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.001}
                        value={displayCompare}
                        onChange={(e) => setPrice(row.id, 'comparePrice', e.target.value, row)}
                        placeholder="—"
                        className={`w-full rounded-xl border px-3 py-2 text-sm tabular-nums text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                          isDirty ? 'border-blue-300 bg-white' : 'border-gray-200 bg-gray-50'
                        }`}
                        style={{ touchAction: 'manipulation' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
