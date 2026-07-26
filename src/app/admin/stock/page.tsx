'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Package, Plus, Minus, History, RefreshCw, Search,
  ChevronUp, AlertTriangle, BoxesIcon, X, Save, Tag,
} from 'lucide-react'

interface StockRow {
  id: string
  sku: string
  name: string
  price: number
  comparePrice: number | null
  currentQty: number
  threshold: number | null
  batches: Batch[]
}

interface Batch {
  id: string
  qtyReceived: number
  qtyRemaining: number
  reference: string | null
  receivedAt: string
}

interface AdjustDialog {
  productId: string
  productName: string
  currentQty: number
  mode: 'add' | 'remove' | 'set'
}

export default function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<AdjustDialog | null>(null)
  const [adjQty, setAdjQty] = useState('')
  const [adjRef, setAdjRef] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [adjLoading, setAdjLoading] = useState(false)
  const [adjError, setAdjError] = useState('')

  // Price editing state: { [productId]: { price: string; comparePrice: string } }
  const [priceEdits, setPriceEdits] = useState<Record<string, { price: string; comparePrice: string }>>({})
  const [savingPrices, setSavingPrices] = useState(false)
  const [priceSaved, setPriceSaved] = useState(false)

  const dirtyCount = Object.keys(priceEdits).length

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/stock?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setRows(data.rows ?? [])
    setPriceEdits({})
    setLoading(false)
  }, [q])

  async function savePrices() {
    if (dirtyCount === 0) return
    setSavingPrices(true)
    const updates = Object.entries(priceEdits).map(([id, v]) => ({
      id,
      price: parseFloat(v.price) || 0,
      comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : null,
    }))
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    setPriceEdits({})
    setPriceSaved(true)
    setTimeout(() => setPriceSaved(false), 2000)
    setSavingPrices(false)
    load()
  }

  function setPrice(id: string, field: 'price' | 'comparePrice', value: string, row: StockRow) {
    setPriceEdits((prev) => ({
      ...prev,
      [id]: {
        price: field === 'price' ? value : (prev[id]?.price ?? String(row.price)),
        comparePrice: field === 'comparePrice' ? value : (prev[id]?.comparePrice ?? String(row.comparePrice ?? '')),
      },
    }))
  }

  useEffect(() => { load() }, [load])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openDialog(row: StockRow, mode: AdjustDialog['mode']) {
    setDialog({ productId: row.id, productName: row.name, currentQty: row.currentQty, mode })
    setAdjQty(mode === 'set' ? String(row.currentQty) : '')
    setAdjRef('')
    setAdjReason('')
    setAdjError('')
  }

  async function submitAdjustment() {
    if (!dialog) return
    const qty = Number(adjQty)
    if (!adjQty || isNaN(qty) || qty < 0) { setAdjError('Enter a valid quantity'); return }

    setAdjLoading(true)
    setAdjError('')

    // Admin never sets purchase cost — that's the shop owner's private business data,
    // entered from the shop's own /shop/stock page instead.
    const payload: Record<string, unknown> = {
      productId: dialog.productId,
      mode: dialog.mode,
      qty,
      reason: adjReason || undefined,
      reference: adjRef || undefined,
    }

    const res = await fetch('/api/admin/stock/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const d = await res.json()
      setAdjError(d.error ?? 'Failed')
      setAdjLoading(false)
      return
    }

    setDialog(null)
    setAdjLoading(false)
    load()
  }

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.sku.toLowerCase().includes(q.toLowerCase())
  )

  const totalItems = rows.reduce((s, r) => s + r.currentQty, 0)
  const lowStockCount = rows.filter((r) => r.threshold != null && r.currentQty <= r.threshold && r.currentQty > 0).length
  const outOfStockCount = rows.filter((r) => r.currentQty === 0).length
  const modeConfig = {
    add: { title: 'Receive Stock', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Plus },
    remove: { title: 'Remove Stock', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: Minus },
    set: { title: 'Set Quantity', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: RefreshCw },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track quantities and sales prices across all shops</p>
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <button
              type="button"
              onClick={savePrices}
              disabled={savingPrices}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              <Save className="h-4 w-4" />
              {savingPrices ? 'Saving…' : `Save Prices (${dirtyCount})`}
            </button>
          )}
          {priceSaved && (
            <span className="text-sm font-semibold text-emerald-600">Saved!</span>
          )}
          <Button size="sm" variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-blue-100">Total Units</span>
            <BoxesIcon className="h-5 w-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold">{totalItems.toLocaleString()}</p>
          <p className="text-xs text-blue-200 mt-1">{rows.length} products tracked</p>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm ${lowStockCount > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-white border border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${lowStockCount > 0 ? 'text-amber-100' : 'text-gray-500'}`}>Low Stock</span>
            <AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? 'text-amber-100' : 'text-amber-400'}`} />
          </div>
          <p className={`text-3xl font-bold ${lowStockCount > 0 ? 'text-white' : 'text-amber-500'}`}>{lowStockCount}</p>
          <p className={`text-xs mt-1 ${lowStockCount > 0 ? 'text-amber-100' : 'text-gray-400'}`}>items below threshold</p>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm ${outOfStockCount > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white' : 'bg-white border border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${outOfStockCount > 0 ? 'text-red-100' : 'text-gray-500'}`}>Out of Stock</span>
            <Package className={`h-5 w-5 ${outOfStockCount > 0 ? 'text-red-200' : 'text-red-400'}`} />
          </div>
          <p className={`text-3xl font-bold ${outOfStockCount > 0 ? 'text-white' : 'text-red-500'}`}>{outOfStockCount}</p>
          <p className={`text-xs mt-1 ${outOfStockCount > 0 ? 'text-red-100' : 'text-gray-400'}`}>products need restocking</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or SKU…"
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="mx-auto mb-3 h-8 w-8 text-gray-300 animate-spin" />
              <p className="text-sm text-gray-400">Loading stock…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No products found</p>
              <p className="text-xs text-gray-400 mt-1">Enable stock tracking on products to see them here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-500">
                    <th className="px-5 py-3.5 text-left font-semibold">Product</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Qty</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Sales Price</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Compare Price</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const isLow = row.threshold != null && row.currentQty <= row.threshold && row.currentQty > 0
                    const isOut = row.currentQty === 0
                    const isExpanded = expanded.has(row.id)

                    const editedPrice = priceEdits[row.id]
                    const displayPrice = editedPrice?.price ?? String(row.price)
                    const displayCompare = editedPrice?.comparePrice ?? String(row.comparePrice ?? '')
                    const isDirty = !!priceEdits[row.id]

                    return (
                      <>
                        <tr
                          key={row.id}
                          className={`border-b border-gray-50 transition-colors hover:bg-blue-50/30 ${isOut ? 'bg-red-50/20' : isLow ? 'bg-amber-50/20' : ''}`}
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              {isDirty && <Tag className="h-3 w-3 text-blue-500 shrink-0" />}
                              {row.name}
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{row.sku}</div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className={`text-xl font-bold tabular-nums ${isOut ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                              {row.currentQty}
                            </span>
                            {row.threshold != null && (
                              <div className="text-xs text-gray-400 mt-0.5">min {row.threshold}</div>
                            )}
                          </td>
                          {/* Sales price — inline editable */}
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={0.001}
                              value={displayPrice}
                              onChange={(e) => setPrice(row.id, 'price', e.target.value, row)}
                              className={`w-24 rounded-lg border px-2 py-1.5 text-right text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-300 ${isDirty ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                            />
                          </td>
                          {/* Compare price — inline editable */}
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={0.001}
                              value={displayCompare}
                              onChange={(e) => setPrice(row.id, 'comparePrice', e.target.value, row)}
                              placeholder="—"
                              className={`w-24 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isDirty ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                            />
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                title="Receive stock"
                                onClick={() => openDialog(row, 'add')}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" /> Add
                              </button>
                              <button
                                title="Remove stock"
                                onClick={() => openDialog(row, 'remove')}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1"
                              >
                                <Minus className="h-3 w-3" /> Remove
                              </button>
                              <button
                                title="View FIFO batches"
                                onClick={() => toggleExpand(row.id)}
                                className={`rounded-lg p-1.5 transition-colors ${isExpanded ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <History className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* FIFO Batch rows */}
                        {isExpanded && (
                          <tr key={`${row.id}-batches`}>
                            <td colSpan={6} className="px-5 py-4 bg-slate-50/70 border-b border-gray-100">
                              <div className="flex items-center gap-2 mb-3">
                                <History className="h-4 w-4 text-slate-400" />
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                  FIFO Batches — {row.batches.length} batch{row.batches.length !== 1 ? 'es' : ''}
                                </p>
                              </div>
                              {row.batches.length === 0 ? (
                                <p className="text-xs text-gray-400 py-2">No batches recorded</p>
                              ) : (
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-500">
                                        <th className="px-4 py-2 text-left font-semibold">Date Received</th>
                                        <th className="px-4 py-2 text-right font-semibold">Received</th>
                                        <th className="px-4 py-2 text-right font-semibold">Remaining</th>
                                        <th className="px-4 py-2 text-left font-semibold">Reference</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                      {row.batches.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50">
                                          <td className="px-4 py-2.5 text-slate-600">
                                            {new Date(b.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-mono">{b.qtyReceived}</td>
                                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">{b.qtyRemaining}</td>
                                          <td className="px-4 py-2.5 text-slate-500 font-mono">{b.reference ?? '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Dialog */}
      {dialog && (() => {
        const cfg = modeConfig[dialog.mode]
        const Icon = cfg.icon
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
              {/* Dialog header */}
              <div className={`px-6 py-4 ${cfg.bg} ${cfg.border} border-b flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2 bg-white shadow-sm`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold ${cfg.color}`}>{cfg.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{dialog.productName}</p>
                  </div>
                </div>
                <button onClick={() => setDialog(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Current qty chip */}
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                  <div className="text-xs text-gray-500">Current quantity</div>
                  <div className="ml-auto text-2xl font-bold text-gray-800 tabular-nums">{dialog.currentQty}</div>
                </div>

                {adjError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                    {adjError}
                  </div>
                )}

                <Input
                  label={dialog.mode === 'set' ? 'New Quantity' : 'Quantity'}
                  type="number"
                  min={0}
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  required
                  placeholder="0"
                />

                {dialog.mode === 'add' && (
                  <Input
                    label="Purchase Reference (optional)"
                    value={adjRef}
                    onChange={(e) => setAdjRef(e.target.value)}
                    placeholder="e.g. PO-2025-001"
                  />
                )}

                <Input
                  label="Reason (optional)"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder={
                    dialog.mode === 'remove'
                      ? 'e.g. Damaged, used in assembly'
                      : dialog.mode === 'add'
                      ? 'e.g. Purchase from supplier'
                      : 'e.g. Inventory count correction'
                  }
                />
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button
                  className={`flex-1 ${dialog.mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : dialog.mode === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  isLoading={adjLoading}
                  onClick={submitAdjustment}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {cfg.title}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
