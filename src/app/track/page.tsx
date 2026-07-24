'use client'

import { useState, useEffect } from 'react'
import { Search, Package, CheckCircle2, Clock, Truck, MapPin, ShoppingBag, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface TrackOrder {
  orderNumber: string
  status: string
  deliveryStatus: string
  customerName?: string
  grandTotal: number
  currency: string
  createdAt: string
  confirmedAt?: string
  preparedAt?: string
  transferredAt?: string
  deliveredAt?: string
  deliveryAddress?: string
  lineItems: { name: string; qty: number; unitPrice: number }[]
  shop?: { name: string; logoUrl?: string; phone?: string }
}

interface MyOrder {
  id: string
  orderNumber: string
  status: string
  grandTotal: number
  currency: string
  createdAt: string
  shop: { name: string; logoUrl?: string | null } | null
  lineItems: { name: string }[]
}

const STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: ShoppingBag, statuses: ['PENDING'] },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2, statuses: ['CONFIRMED'] },
  { key: 'PREPARED', label: 'Ready', icon: Package, statuses: ['PREPARED'] },
  { key: 'IN_DELIVERY', label: 'Out for Delivery', icon: Truck, statuses: ['IN_DELIVERY'] },
  { key: 'COMPLETED', label: 'Delivered', icon: MapPin, statuses: ['COMPLETED'] },
]

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PREPARED', 'IN_DELIVERY', 'COMPLETED']

function getStepIndex(status: string) { return STATUS_ORDER.indexOf(status) }

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: 'Pending',       cls: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:   { label: 'Confirmed',     cls: 'bg-blue-100 text-blue-700' },
  PREPARED:    { label: 'Ready',         cls: 'bg-purple-100 text-purple-700' },
  IN_DELIVERY: { label: 'Out for Delivery', cls: 'bg-orange-100 text-orange-700' },
  COMPLETED:   { label: 'Delivered',     cls: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Cancelled',     cls: 'bg-red-100 text-red-700' },
}

export default function TrackPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<TrackOrder | null>(null)
  const [error, setError] = useState('')
  const [myOrders, setMyOrders] = useState<MyOrder[]>([])
  const [myOrdersLoading, setMyOrdersLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Load user's orders on mount
  useEffect(() => {
    fetch('/api/orders/my')
      .then(r => r.ok ? r.json() : { orders: [] })
      .then(d => { setMyOrders(d.orders ?? []); setMyOrdersLoading(false) })
      .catch(() => setMyOrdersLoading(false))
  }, [])

  const track = async (num?: string) => {
    const query = (num ?? input).trim().toUpperCase()
    if (!query) return
    setLoading(true)
    setError('')
    setOrder(null)
    const res = await fetch(`/api/track/${encodeURIComponent(query)}`)
    if (!res.ok) { setError('Order not found. Please check the order number and try again.'); setLoading(false); return }
    const d = await res.json()
    setOrder(d.order)
    setInput(query)
    setShowForm(false)
    setLoading(false)
    // Scroll to result
    setTimeout(() => document.getElementById('track-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const currentStep = order ? getStepIndex(order.status) : -1
  const isCancelled = order?.status === 'CANCELLED'

  const hasMyOrders = myOrders.length > 0

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <Truck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Track Your Order</h1>
          <p className="text-sm text-gray-500 mt-1">
            {hasMyOrders ? 'Select an order below or enter an order number' : 'Enter your order number to see the latest status'}
          </p>
        </div>

        {/* My Orders panel */}
        {!myOrdersLoading && hasMyOrders && !order && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">My Recent Orders</span>
              <span className="ml-auto text-xs text-gray-400">{myOrders.length} order{myOrders.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {myOrders.map(o => {
                const meta = STATUS_LABELS[o.status] ?? STATUS_LABELS.PENDING
                return (
                  <button key={o.id} type="button" onClick={() => track(o.orderNumber)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors text-left group">
                    {o.shop?.logoUrl ? (
                      <div className="h-10 w-10 rounded-xl overflow-hidden relative shrink-0 border border-gray-100">
                        <Image src={o.shop.logoUrl} alt={o.shop.name ?? ''} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-white">{(o.shop?.name ?? 'S')[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-500">#{o.orderNumber}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                        {o.lineItems[0]?.name ?? o.shop?.name ?? 'Order'}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{Number(o.grandTotal).toFixed(3)}</p>
                      <p className="text-xs text-gray-400">{o.currency}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Track another / show form toggle */}
        {hasMyOrders && !order && (
          <button type="button" onClick={() => setShowForm(!showForm)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
            <Search className="h-4 w-4" />
            Track by order number
            <ChevronDown className={`h-4 w-4 transition-transform ${showForm ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Manual search form — always shown if no my-orders, togglable otherwise */}
        {(!hasMyOrders || showForm || order) && (
          <div className="space-y-3">
            {order && (
              <button type="button" onClick={() => { setOrder(null); setInput(''); setError('') }}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                ← Track another order
              </button>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && track()}
                placeholder="e.g. ORD-20240001"
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button onClick={() => track()} disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Search className="h-4 w-4" />
                {loading ? '...' : 'Track'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Result */}
        {order && (
          <div id="track-result" className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Shop header */}
            {order.shop && (
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
                {order.shop.logoUrl ? (
                  <div className="h-9 w-9 rounded-xl overflow-hidden relative shrink-0">
                    <Image src={order.shop.logoUrl} alt={order.shop.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-white">{order.shop.name[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{order.shop.name}</p>
                  <p className="text-xs text-gray-400">Order #{order.orderNumber}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  isCancelled ? 'bg-red-100 text-red-700' :
                  order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {STATUS_LABELS[order.status]?.label ?? order.status}
                </span>
              </div>
            )}

            {/* Progress steps */}
            {!isCancelled && (
              <div className="px-5 py-5">
                <div className="relative">
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
                  <div
                    className="absolute left-4 top-4 w-0.5 bg-blue-500 transition-all"
                    style={{ height: `${Math.min(currentStep / (STEPS.length - 1), 1) * 100}%` }}
                  />
                  <div className="space-y-5 relative">
                    {STEPS.map((step, i) => {
                      const done = i <= currentStep
                      const active = i === currentStep
                      const Icon = step.icon
                      return (
                        <div key={step.key} className="flex items-start gap-4">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 z-10 transition-all ${
                            done ? 'border-blue-500 bg-blue-500' : 'border-gray-200 bg-white'
                          }`}>
                            <Icon className={`h-4 w-4 ${done ? 'text-white' : 'text-gray-300'}`} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className={`text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                            {active && <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> In progress</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="px-5 py-5">
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-4 text-center">
                  <p className="text-sm font-semibold text-red-700">This order has been cancelled</p>
                  <p className="text-xs text-red-500 mt-1">Please contact the shop if you have questions</p>
                </div>
              </div>
            )}

            {/* Delivery address */}
            {order.deliveryAddress && (
              <div className="mx-5 mb-4 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-600">Delivery Address</p>
                  <p className="text-sm text-gray-700 mt-0.5">{order.deliveryAddress}</p>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="border-t border-gray-100 px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Items</p>
              <div className="space-y-2">
                {order.lineItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 flex-1">{item.name}</span>
                    <span className="text-gray-400 mx-3">×{Number(item.qty)}</span>
                    <span className="font-semibold text-gray-900">{Number(item.unitPrice).toFixed(3)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-sm font-black text-blue-700">{Number(order.grandTotal).toFixed(3)} {order.currency}</span>
              </div>
            </div>

            {/* Contact */}
            {order.shop?.phone && (
              <div className="border-t border-gray-100 px-5 py-4">
                <a href={`tel:${order.shop.phone}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Contact Shop
                </a>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          <Link href="/" className="hover:text-blue-600">← Back to store</Link>
        </p>
      </div>
    </div>
  )
}
