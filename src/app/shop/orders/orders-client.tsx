'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShoppingCart, Search, ChevronDown, ChevronUp, CheckCircle2,
  Clock, Truck, Package, XCircle, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, MapPin, Phone,
} from 'lucide-react'

type RawStatus = 'PENDING' | 'CONFIRMED' | 'PREPARED' | 'IN_DELIVERY' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
type FilterStatus = 'ALL' | RawStatus

type ShopRole = 'MANAGER' | 'STAFF' | 'CASHIER'

interface OrderLine { name: string; qty: unknown; unitPrice: unknown; lineTotal: unknown }
interface Order {
  id: string
  orderNumber: string
  status: RawStatus
  customerName: string | null
  customerEmail: string | null
  grandTotal: unknown
  currency: string
  createdAt: string
  notes: string | null
  deliveryAddress: string | null
  pickupAddress: string | null
  confirmedAt: string | null
  preparedAt: string | null
  transferredAt: string | null
  deliveredAt: string | null
  customer: { displayName: string; mobile: string } | null
  lineItems: OrderLine[]
  assignedTo: { name: string | null } | null
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string; Icon: React.ComponentType<{ className?: string }> }> = {
  PENDING:     { label: 'Pending',      cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',  Icon: Clock },
  CONFIRMED:   { label: 'Confirmed',    cls: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',   Icon: CheckCircle2 },
  PREPARED:    { label: 'Ready',        cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400', Icon: Package },
  IN_DELIVERY: { label: 'Out Delivery', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', Icon: Truck },
  PROCESSING:  { label: 'Processing',   cls: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-300',   Icon: Package },
  SHIPPED:     { label: 'Shipped',      cls: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400', Icon: Truck },
  COMPLETED:   { label: 'Completed',    cls: 'bg-green-100 text-green-700',   dot: 'bg-green-400',  Icon: CheckCircle2 },
  CANCELLED:   { label: 'Cancelled',    cls: 'bg-red-100 text-red-700',       dot: 'bg-red-400',    Icon: XCircle },
  REFUNDED:    { label: 'Refunded',     cls: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400',   Icon: RefreshCw },
}

const STATUS_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'ALL',         label: 'All' },
  { key: 'PENDING',     label: 'Pending' },
  { key: 'CONFIRMED',   label: 'Confirmed' },
  { key: 'PREPARED',    label: 'Ready' },
  { key: 'IN_DELIVERY', label: 'Delivery' },
  { key: 'COMPLETED',   label: 'Done' },
  { key: 'CANCELLED',   label: 'Cancelled' },
]

function getActions(status: RawStatus, role: ShopRole): { label: string; action: string; cls: string; needsAddress?: boolean }[] {
  const canManage = role === 'MANAGER' || role === 'STAFF'
  const cancelBtn = { label: 'Cancel Order', action: 'cancel', cls: 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' }

  switch (status) {
    case 'PENDING':
      return canManage
        ? [{ label: 'Confirm Order', action: 'confirm', cls: 'bg-blue-600 text-white hover:bg-blue-700' }, ...(role === 'MANAGER' ? [cancelBtn] : [])]
        : []
    case 'CONFIRMED':
      return canManage
        ? [{ label: 'Mark Ready', action: 'prepare', cls: 'bg-purple-600 text-white hover:bg-purple-700' }, ...(role === 'MANAGER' ? [cancelBtn] : [])]
        : []
    case 'PREPARED':
      return canManage
        ? [{ label: 'Send to Delivery', action: 'transfer_delivery', cls: 'bg-orange-500 text-white hover:bg-orange-600', needsAddress: true }, ...(role === 'MANAGER' ? [cancelBtn] : [])]
        : []
    case 'IN_DELIVERY':
      return [{ label: 'Mark Delivered', action: 'deliver', cls: 'bg-green-600 text-white hover:bg-green-700' }]
    case 'PROCESSING':
      return canManage
        ? [{ label: 'Mark Shipped', action: 'ship', cls: 'bg-indigo-600 text-white hover:bg-indigo-700' }, ...(role === 'MANAGER' ? [cancelBtn] : [])]
        : []
    case 'SHIPPED':
      return canManage
        ? [{ label: 'Mark Completed', action: 'complete', cls: 'bg-green-600 text-white hover:bg-green-700' }]
        : []
    default:
      return []
  }
}

interface Props {
  role: ShopRole
  shopAddress: string
}

export function ShopOrdersClient({ role, shopAddress }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  // Delivery address form
  const [deliveryFormId, setDeliveryFormId] = useState<string | null>(null)
  const [pickupAddr, setPickupAddr] = useState('')
  const [deliveryAddr, setDeliveryAddr] = useState('')

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

  async function performAction(order: Order, action: string) {
    if (action === 'cancel') { setCancellingId(order.id); return }
    if (action === 'transfer_delivery') {
      setPickupAddr(order.pickupAddress ?? shopAddress)
      setDeliveryAddr(order.deliveryAddress ?? '')
      setDeliveryFormId(order.id)
      return
    }
    setActing(order.id)
    await fetch(`/api/shop/orders/${order.id}`, {
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

  async function confirmTransfer(orderId: string) {
    setActing(orderId)
    await fetch(`/api/shop/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transfer_delivery', pickupAddress: pickupAddr, deliveryAddress: deliveryAddr }),
    })
    setDeliveryFormId(null)
    await load()
    setActing(null)
  }

  const fmt = (n: unknown, currency = 'BHD') => `${Number(n).toFixed(3)} ${currency}`

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Orders</h1>
            <p className="text-xs text-gray-500">{total} total · {role} view</p>
          </div>
        </div>
        <button type="button" onClick={load}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 active:bg-gray-100">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Order #, customer name or email…"
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 scrollbar-none">
        {STATUS_TABS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setStatusFilter(key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
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
            const actions = getActions(order.status, role)
            const isCancelling = cancellingId === order.id
            const isDeliveryForm = deliveryFormId === order.id

            return (
              <div key={order.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${sm?.dot ?? 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${sm?.cls}`}>
                        <Icon className="h-3 w-3" />
                        {sm?.label ?? order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {order.customer?.displayName ?? order.customerName ?? 'Guest'}
                      {' · '}
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(order.grandTotal, order.currency)}</p>
                    <p className="text-xs text-gray-400">{order.lineItems.length} item{order.lineItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">

                    {/* Order timeline */}
                    {['CONFIRMED', 'PREPARED', 'IN_DELIVERY', 'COMPLETED'].includes(order.status) && (
                      <div className="flex gap-1 text-[10px] text-gray-400 overflow-x-auto pb-1">
                        {[
                          { label: 'Placed', at: order.createdAt },
                          { label: 'Confirmed', at: order.confirmedAt },
                          { label: 'Ready', at: order.preparedAt },
                          { label: 'Sent', at: order.transferredAt },
                          { label: 'Delivered', at: order.deliveredAt },
                        ].map(({ label, at }) => at ? (
                          <span key={label} className="shrink-0 flex flex-col items-center gap-0.5 px-2">
                            <span className="h-1 w-1 rounded-full bg-blue-400" />
                            <span className="font-medium text-blue-600">{label}</span>
                            <span>{new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        ) : null)}
                      </div>
                    )}

                    {/* Line items */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Items</p>
                      <div className="space-y-1.5">
                        {order.lineItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm gap-2">
                            <span className="text-gray-700 flex-1 min-w-0 truncate">{item.name} <span className="text-gray-400">× {Number(item.qty)}</span></span>
                            <span className="font-medium text-gray-900 shrink-0">{fmt(item.lineTotal, order.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer info */}
                    {order.customer && (
                      <div className="flex items-start gap-3 rounded-xl bg-white border border-gray-200 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700">{order.customer.displayName}</p>
                          {order.customer.mobile && (
                            <a href={`tel:${order.customer.mobile}`}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-0.5">
                              <Phone className="h-3 w-3" />{order.customer.mobile}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delivery addresses */}
                    {(order.pickupAddress || order.deliveryAddress) && (
                      <div className="space-y-1.5">
                        {order.pickupAddress && (
                          <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                            <MapPin className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Pickup</p>
                              <p className="text-xs text-gray-700">{order.pickupAddress}</p>
                            </div>
                          </div>
                        )}
                        {order.deliveryAddress && (
                          <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-100 px-3 py-2">
                            <MapPin className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Delivery</p>
                              <p className="text-xs text-gray-700">{order.deliveryAddress}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800 flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {order.notes}
                      </div>
                    )}

                    {/* Delivery address form */}
                    {isDeliveryForm && (
                      <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 space-y-3">
                        <p className="text-xs font-semibold text-orange-800">Enter delivery details</p>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-600 font-medium">Pickup / Collection address</label>
                            <input
                              value={pickupAddr}
                              onChange={(e) => setPickupAddr(e.target.value)}
                              placeholder="Shop address or pickup point"
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 font-medium">Customer delivery address</label>
                            <input
                              value={deliveryAddr}
                              onChange={(e) => setDeliveryAddr(e.target.value)}
                              placeholder="Customer's address"
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => confirmTransfer(order.id)} disabled={acting === order.id}
                            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                            <Truck className="h-4 w-4" />
                            {acting === order.id ? 'Sending…' : 'Send to Delivery'}
                          </button>
                          <button type="button" onClick={() => setDeliveryFormId(null)}
                            className="text-sm text-gray-500 hover:text-gray-700 px-3">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cancel form */}
                    {isCancelling && (
                      <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2">
                        <p className="text-xs font-semibold text-red-700">Reason for cancellation</p>
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
                            className="text-sm text-gray-500 hover:text-gray-700 px-3">Keep Order</button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isCancelling && !isDeliveryForm && actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {actions.map(({ label, action, cls }) => (
                          <button key={action} type="button" disabled={acting === order.id}
                            onClick={() => performAction(order, action)}
                            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${cls}`}>
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
