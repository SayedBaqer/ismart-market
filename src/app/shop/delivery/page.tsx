'use client'

import { useEffect, useState, useCallback } from 'react'
import { Truck, Package, Phone, MapPin, Check, X, RefreshCw, User } from 'lucide-react'

interface DeliveryOrder {
  id: string
  orderNumber: string
  customerName: string | null
  customerEmail: string | null
  shippingAddress: Record<string, string>
  grandTotal: number
  currency: string
  deliveryStatus: string
  assignedTo: { id: string; name: string | null } | null
  notes: string | null
  deliveryNotes: string | null
  createdAt: string
}

interface StaffUser {
  id: string
  name: string | null
  email: string
  role: string
}

const DELIVERY_STATUS_CONFIG = {
  NOT_ASSIGNED: { label: 'Unassigned', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  PICKED_UP: { label: 'Picked Up', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  RETURNED: { label: 'Returned', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
}

const NEXT_STATUS: Record<string, string> = {
  ASSIGNED: 'PICKED_UP',
  PICKED_UP: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
}

export default function DeliveryBoardPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [updating, setUpdating] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    const [ordersRes, staffRes, meRes] = await Promise.all([
      fetch('/api/shop/delivery'),
      fetch('/api/shop/staff'),
      fetch('/api/admin/me'),
    ])
    const [ordersData, staffData, meData] = await Promise.all([
      ordersRes.json(),
      staffRes.json(),
      meRes.json(),
    ])
    setOrders(ordersData.orders ?? [])
    setStaff(staffData.staff ?? [])
    setMyRole(meData.role ?? '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateDeliveryStatus(orderId: string, deliveryStatus: string) {
    setUpdating(orderId)
    await fetch(`/api/shop/delivery/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryStatus }),
    })
    await load()
    setUpdating(null)
  }

  async function assignDelivery(orderId: string, assignedToId: string) {
    setUpdating(orderId)
    await fetch(`/api/shop/delivery/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId, deliveryStatus: assignedToId ? 'ASSIGNED' : 'NOT_ASSIGNED' }),
    })
    await load()
    setUpdating(null)
  }

  const isDeliveryPerson = myRole === 'CASHIER'
  const isSales = ['STAFF', 'MANAGER'].includes(myRole)

  const filtered = orders.filter((o) => {
    if (filterStatus === 'active') return !['DELIVERED', 'FAILED', 'RETURNED'].includes(o.deliveryStatus)
    if (filterStatus === 'done') return ['DELIVERED'].includes(o.deliveryStatus)
    if (filterStatus === 'issues') return ['FAILED', 'RETURNED'].includes(o.deliveryStatus)
    return true
  })

  const deliveryStaff = staff.filter((s) => s.role === 'CASHIER')

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-600" />
            Delivery Board
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} orders · tap to update</p>
        </div>
        <button onClick={load} className="rounded-xl p-2 bg-gray-100 hover:bg-gray-200 transition-colors">
          <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'active', label: 'Active', count: orders.filter((o) => !['DELIVERED', 'FAILED', 'RETURNED'].includes(o.deliveryStatus)).length },
          { id: 'done', label: 'Delivered', count: orders.filter((o) => o.deliveryStatus === 'DELIVERED').length },
          { id: 'issues', label: 'Issues', count: orders.filter((o) => ['FAILED', 'RETURNED'].includes(o.deliveryStatus)).length },
          { id: 'all', label: 'All', count: orders.length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              filterStatus === f.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 text-xs font-bold ${filterStatus === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading orders…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Truck className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No orders in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const cfg = DELIVERY_STATUS_CONFIG[order.deliveryStatus as keyof typeof DELIVERY_STATUS_CONFIG] ?? DELIVERY_STATUS_CONFIG.NOT_ASSIGNED
            const nextStatus = NEXT_STATUS[order.deliveryStatus]
            const addr = order.shippingAddress
            const isUpdating = updating === order.id

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{order.grandTotal.toFixed(3)} {order.currency}</span>
                </div>

                <div className="px-4 py-3 space-y-2.5">
                  {/* Customer */}
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-800">{order.customerName ?? 'Guest'}</span>
                    {order.customerEmail && (
                      <a href={`mailto:${order.customerEmail}`} className="text-blue-500 text-xs hover:underline ml-auto">
                        Contact
                      </a>
                    )}
                  </div>

                  {/* Address */}
                  {(addr?.street || addr?.city || addr?.address) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-600 text-xs leading-relaxed">
                        {[addr.street, addr.address, addr.city, addr.governorate, addr.country]
                          .filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Phone */}
                  {(addr?.phone || addr?.mobile) && (
                    <a href={`tel:${addr.phone ?? addr.mobile}`} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                      <Phone className="h-4 w-4" />
                      {addr.phone ?? addr.mobile}
                    </a>
                  )}

                  {/* Notes */}
                  {order.deliveryNotes && (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                      📋 {order.deliveryNotes}
                    </div>
                  )}

                  {/* Assign delivery person (sales/manager only) */}
                  {isSales && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-400 shrink-0" />
                      <select
                        value={order.assignedTo?.id ?? ''}
                        onChange={(e) => assignDelivery(order.id, e.target.value)}
                        disabled={isUpdating}
                        className="flex-1 text-xs rounded-lg border border-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">— Unassigned —</option>
                        {deliveryStaff.map((s) => (
                          <option key={s.id} value={s.id}>{s.name ?? s.email}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Assigned to (read-only for delivery) */}
                  {isDeliveryPerson && order.assignedTo && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Truck className="h-3.5 w-3.5" />
                      Assigned to: <span className="font-medium text-gray-700">{order.assignedTo.name}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-4 flex gap-2">
                  {nextStatus && (
                    <button
                      onClick={() => updateDeliveryStatus(order.id, nextStatus)}
                      disabled={isUpdating}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 text-white text-sm font-semibold py-2.5 hover:bg-purple-700 disabled:opacity-60 transition-colors"
                    >
                      {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {DELIVERY_STATUS_CONFIG[nextStatus as keyof typeof DELIVERY_STATUS_CONFIG]?.label ?? nextStatus}
                    </button>
                  )}
                  {order.deliveryStatus === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => updateDeliveryStatus(order.id, 'FAILED')}
                      disabled={isUpdating}
                      className="rounded-xl border border-red-200 text-red-600 px-3 py-2.5 text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {order.deliveryStatus === 'NOT_ASSIGNED' && isSales && (
                    <div className="flex-1 text-center text-xs text-gray-400 py-2.5">
                      Assign a delivery person above
                    </div>
                  )}
                  {order.deliveryStatus === 'DELIVERED' && (
                    <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold py-2.5">
                      <Check className="h-4 w-4" /> Delivered
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
