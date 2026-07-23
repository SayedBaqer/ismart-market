'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShoppingCart, Search, ChevronDown, ChevronUp, CheckCircle2,
  Clock, Truck, Package, XCircle, RefreshCw, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'

type OrderStatus = 'ALL' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'

interface OrderLine { name: string; qty: unknown; unitPrice: unknown; lineTotal: unknown }
interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  customerName: string | null
  customerEmail: string | null
  grandTotal: unknown
  currency: string
  createdAt: string
  notes: string | null
  customer: { displayName: string; mobile: string } | null
  lineItems: OrderLine[]
  assignedTo: { name: string | null } | null
}

const STATUS_META: Record<string, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  PENDING:    { label: 'Pending',    cls: 'bg-amber-100 text-amber-700',   Icon: Clock },
  PROCESSING: { label: 'Processing', cls: 'bg-blue-100 text-blue-700',     Icon: Package },
  SHIPPED:    { label: 'Shipped',    cls: 'bg-indigo-100 text-indigo-700', Icon: Truck },
  COMPLETED:  { label: 'Completed',  cls: 'bg-green-100 text-green-700',   Icon: CheckCircle2 },
  CANCELLED:  { label: 'Cancelled',  cls: 'bg-red-100 text-red-700',       Icon: XCircle },
  REFUNDED:   { label: 'Refunded',   cls: 'bg-gray-100 text-gray-600',     Icon: RefreshCw },
}

const STATUS_TABS: { key: OrderStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

const ACTIONS: Record<string, { label: string; action: string; cls: string }[]> = {
  PENDING:    [{ label: 'Confirm Order', action: 'confirm', cls: 'bg-blue-600 text-white hover:bg-blue-700' }, { label: 'Cancel', action: 'cancel', cls: 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' }],
  PROCESSING: [{ label: 'Mark Shipped', action: 'ship', cls: 'bg-indigo-600 text-white hover:bg-indigo-700' }, { label: 'Cancel', action: 'cancel', cls: 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' }],
  SHIPPED:    [{ label: 'Mark Completed', action: 'complete', cls: 'bg-green-600 text-white hover:bg-green-700' }],
}

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: statusFilter, page: String(page) })
      if (search) params.set('q', search)
      const res = await fetch(`/api/shop/orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders ?? [])
        setTotalPages(data.pages ?? 1)
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [statusFilter, search])

  async function performAction(orderId: string, action: string) {
    if (action === 'cancel') {
      setCancellingId(orderId)
      return
    }
    setActing(orderId)
    await fetch(`/api/shop/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    await load()
    setActing(null)
  }

  async function confirmCancel(orderId: string) {
    setActing(orderId)
    await fetch(`/api/shop/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', cancelReason }),
    })
    setCancellingId(null)
    setCancelReason('')
    await load()
    setActing(null)
  }

  const fmt = (n: unknown, currency = 'BHD') => `${Number(n).toFixed(3)} ${currency}`

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-5 w-5 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-xs text-gray-500">{total} total orders</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer name or email…"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button type="button" onClick={load} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 scrollbar-none">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <ShoppingCart className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const sm = STATUS_META[order.status]
            const Icon = sm?.Icon ?? Clock
            const isExpanded = expandedId === order.id
            const actions = ACTIONS[order.status] ?? []
            const isCancelling = cancellingId === order.id

            return (
              <div key={order.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${sm?.cls}`}>
                        <Icon className="h-3 w-3" />
                        {sm?.label ?? order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.customer?.displayName ?? order.customerName ?? 'Guest'}
                      {' · '}
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(order.grandTotal, order.currency)}</p>
                    <p className="text-xs text-gray-400">{order.lineItems.length} item{order.lineItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button type="button" onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                    {/* Line items */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Items</p>
                      <div className="space-y-1">
                        {order.lineItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.name} × {Number(item.qty)}</span>
                            <span className="font-medium text-gray-900">{fmt(item.lineTotal, order.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer info */}
                    {order.customer && (
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p className="font-semibold text-gray-700">{order.customer.displayName}</p>
                        <p>{order.customer.mobile}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                        <AlertCircle className="inline h-3 w-3 mr-1" />
                        {order.notes}
                      </div>
                    )}

                    {/* Cancel reason input */}
                    {isCancelling && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-red-700">Reason for cancellation (shown to customer)</p>
                        <input
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="e.g. Out of stock, Customer requested"
                          className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => confirmCancel(order.id)} disabled={acting === order.id}
                            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                            <XCircle className="h-4 w-4" />
                            {acting === order.id ? 'Cancelling…' : 'Confirm Cancel'}
                          </button>
                          <button type="button" onClick={() => setCancellingId(null)}
                            className="text-sm text-gray-500 hover:text-gray-700 px-3">
                            Keep Order
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isCancelling && actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {actions.map(({ label, action, cls }) => (
                          <button
                            key={action}
                            type="button"
                            disabled={acting === order.id}
                            onClick={() => performAction(order.id, action)}
                            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${cls}`}
                          >
                            {acting === order.id ? 'Working…' : label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
