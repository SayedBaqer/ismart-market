'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp, Clock, DollarSign, BarChart2, FileText, ChevronRight,
  Search, RefreshCw, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { useShopT } from '@/components/shop/lang-provider'
import type { ShopTranslations } from '@/lib/i18n/shop'

type Tab = 'overview' | 'documents'

interface MoneyFlow {
  totalRevenue: number
  pendingRevenue: number
  commissionOwed: number
  commissionRate: number
  commissionType: string
  netEarnings: number
  completedCount: number
  pendingCount: number
  cancelledCount: number
  recentOrders: {
    orderNumber: string; status: string; grandTotal: number
    currency: string; createdAt: string
    customerName: string | null; customer: { displayName: string } | null
  }[]
  dailyRevenue: { day: string; total: number; count: number }[]
}

interface Doc {
  id: string; docType: string; docNumber: string; status: string
  grandTotal: number; currency: string; issueDate: string | null; dueDate: string | null
  customer: { id: string; displayName: string } | null
  _count: { items: number; payments: number }
}

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  partial:   'bg-yellow-100 text-yellow-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const ORDER_STATUS_BADGE: Record<string, string> = {
  PENDING:     'bg-amber-100 text-amber-700',
  CONFIRMED:   'bg-blue-100 text-blue-700',
  PREPARED:    'bg-purple-100 text-purple-700',
  IN_DELIVERY: 'bg-orange-100 text-orange-700',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-600',
}

const DOC_TYPES = ['ALL', 'INVOICE', 'ESTIMATE', 'SALES_ORDER', 'CREDIT_NOTE']
function docLabels(t: ShopTranslations): Record<string, string> {
  return {
    ALL: t.billDocAll, INVOICE: t.billDocInvoice, ESTIMATE: t.billDocEstimate,
    SALES_ORDER: t.billDocSalesOrder, CREDIT_NOTE: t.billDocCreditNote,
  }
}

function fmt(n: number, currency = 'BHD') {
  return `${n.toFixed(3)} ${currency}`
}

function MiniChart({ data }: { data: { day: string; total: number }[] }) {
  const t = useShopT()
  if (!data.length) return <div className="h-16 flex items-center justify-center text-xs text-gray-400">{t.billNoData}</div>
  const max = Math.max(...data.map((d) => d.total), 0.001)
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t-sm bg-blue-500 transition-all"
            style={{ height: `${(d.total / max) * 52}px`, minHeight: d.total > 0 ? 2 : 0 }}
            title={`${d.day}: ${fmt(d.total)}`}
          />
        </div>
      ))}
    </div>
  )
}

export default function ShopBillingPage() {
  const t = useShopT()
  const DOC_LABELS = docLabels(t)
  const [tab, setTab] = useState<Tab>('overview')
  const [flow, setFlow] = useState<MoneyFlow | null>(null)
  const [flowLoading, setFlowLoading] = useState(true)

  // Documents state
  const [docs, setDocs] = useState<Doc[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docType, setDocType] = useState('ALL')
  const [docSearch, setDocSearch] = useState('')
  const [docsPage, setDocsPage] = useState(1)
  const [docsTotal, setDocsTotal] = useState(0)
  const [docsTotalPages, setDocsTotalPages] = useState(1)

  // Load money flow
  useEffect(() => {
    fetch('/api/shop/money-flow')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setFlow(d) })
      .finally(() => setFlowLoading(false))
  }, [])

  // Load documents
  const loadDocs = useCallback(async () => {
    setDocsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(docsPage) })
      if (docType !== 'ALL') params.set('docType', docType)
      if (docSearch) params.set('q', docSearch)
      const res = await fetch(`/api/shop/billing?${params}`)
      if (res.ok) {
        const d = await res.json()
        setDocs(d.docs ?? [])
        setDocsTotal(d.total ?? 0)
        setDocsTotalPages(d.totalPages ?? 1)
      }
    } finally {
      setDocsLoading(false)
    }
  }, [docType, docSearch, docsPage])

  useEffect(() => { if (tab === 'documents') loadDocs() }, [tab, loadDocs])
  useEffect(() => { setDocsPage(1) }, [docType, docSearch])

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t.billTitle}</h1>
            <p className="text-xs text-gray-500">{t.billSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['overview', 'documents'] as Tab[]).map((tabKey) => (
          <button key={tabKey} type="button" onClick={() => setTab(tabKey)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${tab === tabKey ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tabKey === 'overview' ? t.billTabMoneyFlow : t.billTabDocuments}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {flowLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : flow ? (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                  <p className="text-xs text-gray-500 font-medium">{t.billTotalRevenue}</p>
                  <p className="mt-1 text-xl font-black text-gray-900">{fmt(flow.totalRevenue)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{flow.completedCount} {t.billOrdersSuffix}</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                  <p className="text-xs text-gray-500 font-medium">{t.billInPipeline}</p>
                  <p className="mt-1 text-xl font-black text-blue-600">{fmt(flow.pendingRevenue)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{flow.pendingCount} {t.billActiveSuffix}</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                  <p className="text-xs text-gray-500 font-medium">{t.billPlatformFee}</p>
                  <p className="mt-1 text-xl font-black text-orange-500">{fmt(flow.commissionOwed)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {flow.commissionType === 'percentage' ? `${flow.commissionRate}%` : `${fmt(flow.commissionRate)} ${t.billPerOrder}`}
                  </p>
                </div>
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 shadow-sm">
                  <p className="text-xs text-green-700 font-medium">{t.billNetEarnings}</p>
                  <p className="mt-1 text-xl font-black text-green-700">{fmt(flow.netEarnings)}</p>
                  <p className="text-xs text-green-500 mt-0.5">{t.billAfterPlatformFee}</p>
                </div>
              </div>

              {/* Daily chart */}
              <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-700">{t.billRevenueLast14}</p>
                  </div>
                </div>
                <MiniChart data={flow.dailyRevenue} />
                {flow.dailyRevenue.length > 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{flow.dailyRevenue[0]?.day?.slice(5)}</span>
                    <span className="text-[10px] text-gray-400">{flow.dailyRevenue[flow.dailyRevenue.length - 1]?.day?.slice(5)}</span>
                  </div>
                )}
              </div>

              {/* Recent orders */}
              {flow.recentOrders.length > 0 && (
                <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-semibold text-gray-700">{t.billRecentOrders}</p>
                    </div>
                    <Link href="/shop/orders" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                      {t.billViewAll} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {flow.recentOrders.map((order) => (
                      <div key={order.orderNumber} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-900">#{order.orderNumber}</span>
                            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${ORDER_STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {order.customer?.displayName ?? order.customerName ?? t.billGuest}
                            {' · '}
                            {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 shrink-0">{fmt(order.grandTotal, order.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
              <p className="text-sm text-gray-400">{t.billUnableToLoad}</p>
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab === 'documents' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder={t.billSearchPlaceholder}
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="relative">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none"
              >
                {DOC_TYPES.map((dt) => <option key={dt} value={dt}>{DOC_LABELS[dt]}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>
            <button type="button" onClick={loadDocs}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${docsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-gray-400">{(docsTotal !== 1 ? t.billDocCountPlural : t.billDocCount).replace('{count}', String(docsTotal))}</p>

          {docsLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16">
              <FileText className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-500">{t.billNoDocuments}</p>
              <p className="text-xs text-gray-400 mt-1">{t.billCreateFromAdmin}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/admin/billing/${doc.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">{doc.docNumber}</span>
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_BADGE[doc.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {doc.customer?.displayName ?? '—'}
                      {doc.issueDate && ` · ${new Date(doc.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(Number(doc.grandTotal), doc.currency)}</p>
                    <p className="text-xs text-gray-400">{doc._count.items} {t.billLines} · {doc._count.payments} {t.billPymt}</p>
                  </div>
                  <Clock className="h-4 w-4 text-gray-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {docsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button type="button" onClick={() => setDocsPage((p) => Math.max(1, p - 1))} disabled={docsPage === 1}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                ‹
              </button>
              <span className="text-sm text-gray-600">{t.billPageOf.replace('{page}', String(docsPage)).replace('{total}', String(docsTotalPages))}</span>
              <button type="button" onClick={() => setDocsPage((p) => Math.min(docsTotalPages, p + 1))} disabled={docsPage === docsTotalPages}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
