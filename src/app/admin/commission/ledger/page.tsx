'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, CheckCircle2, RefreshCw, ChevronDown, ChevronRight, Plus, Store } from 'lucide-react'
import Link from 'next/link'

interface Payment { amount: number; paidAt: string; note?: string }
interface ShopRow {
  shopId: string; shopName: string; shopSlug?: string; plan: string
  revenue: number; orderCount: number
  salesCommission: number; deliveryCommission: number
  totalOwed: number; totalPaid: number; balance: number
  payments: Payment[]
}
interface Totals {
  totalRevenue: number; totalOwed: number; totalPaid: number; totalBalance: number
  salesRate: string; deliveryRate: string
}

type Period = 'all' | 'month' | 'week'

function fmt(n: number) { return n.toFixed(3) }

export default function CommissionLedgerPage() {
  const [rows, setRows] = useState<ShopRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [payingShop, setPayingShop] = useState<ShopRow | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/commission?period=${period}`)
      if (res.ok) {
        const d = await res.json()
        setRows(d.rows ?? [])
        setTotals(d.totals ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  async function recordPayment() {
    if (!payingShop || !payAmount) return
    setSaving(true)
    await fetch('/api/admin/commission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: payingShop.shopId, amount: Number(payAmount), note: payNote }),
    })
    setPayingShop(null); setPayAmount(''); setPayNote('')
    setSaving(false); await load()
  }

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'month', label: 'This Month' },
    { key: 'week', label: 'This Week' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Commission Ledger</h1>
            <p className="text-xs text-gray-500">Platform fees owed per shop · <Link href="/admin/commission" className="text-blue-600 hover:underline">Edit rates</Link></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {PERIODS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setPeriod(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${period === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={load}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: fmt(totals.totalRevenue), cls: 'text-gray-900' },
            { label: 'Commission Owed', value: fmt(totals.totalOwed), sub: `Sales: ${totals.salesRate} · Del: ${totals.deliveryRate}`, cls: 'text-orange-600' },
            { label: 'Total Collected', value: fmt(totals.totalPaid), cls: 'text-green-600' },
            { label: 'Outstanding', value: fmt(totals.totalBalance), cls: totals.totalBalance > 0 ? 'text-red-700' : 'text-green-600' },
          ].map(({ label, value, sub, cls }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-black mt-0.5 ${cls}`}>{value}</p>
              {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16">
          <Store className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No completed orders in this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isExpanded = expandedId === row.shopId
            const isPaid = row.balance <= 0.001
            return (
              <div key={row.shopId} className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${isPaid ? 'border-green-200' : 'border-orange-200'}`}>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : row.shopId)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isPaid ? 'bg-green-400' : 'bg-orange-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{row.shopName}</span>
                      <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-blue-100 text-blue-600">{row.plan}</span>
                      {isPaid && <span className="text-[10px] font-semibold text-green-600 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" />Settled</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{row.orderCount} orders · Revenue: {fmt(row.revenue)} BHD</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">Owed: {fmt(row.totalOwed)}</p>
                    <p className={`text-xs font-semibold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>Balance: {fmt(row.balance)}</p>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      {[
                        ['Sales Commission', fmt(row.salesCommission), 'text-gray-900'],
                        ['Delivery Commission', fmt(row.deliveryCommission), 'text-gray-900'],
                        ['Total Paid', fmt(row.totalPaid), 'text-green-700'],
                        ['Outstanding', fmt(row.balance), row.balance > 0 ? 'text-red-600' : 'text-green-600'],
                      ].map(([label, value, cls]) => (
                        <div key={label}>
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className={`font-bold ${cls}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {row.payments.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment History</p>
                        <div className="space-y-1.5">
                          {row.payments.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-3 py-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-green-800">{fmt(p.amount)} BHD</p>
                                {p.note && <p className="text-xs text-green-600">{p.note}</p>}
                              </div>
                              <p className="text-xs text-gray-400">{new Date(p.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isPaid && (
                      <button type="button" onClick={() => { setPayingShop(row); setPayAmount(fmt(row.balance)) }}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                        <Plus className="h-4 w-4" />Record Payment
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {payingShop && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayingShop(null)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Record Commission Payment</h3>
            <p className="text-sm text-gray-500">Shop: <strong>{payingShop.shopName}</strong> · Balance: <strong>{fmt(payingShop.balance)} BHD</strong></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Amount Paid (BHD)</label>
                <input type="number" step="0.001" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Note (optional)</label>
                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                  placeholder="Bank transfer, cash, etc."
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={recordPayment} disabled={saving || !payAmount}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Confirm Payment'}
              </button>
              <button type="button" onClick={() => setPayingShop(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
