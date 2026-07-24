'use client'

import { useState } from 'react'
import { Search, Package, CheckCircle2, Clock, Truck, MapPin, ShoppingBag } from 'lucide-react'
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

const STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: ShoppingBag, statuses: ['PENDING'] },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2, statuses: ['CONFIRMED'] },
  { key: 'PREPARED', label: 'Ready', icon: Package, statuses: ['PREPARED'] },
  { key: 'IN_DELIVERY', label: 'Out for Delivery', icon: Truck, statuses: ['IN_DELIVERY'] },
  { key: 'COMPLETED', label: 'Delivered', icon: MapPin, statuses: ['COMPLETED'] },
]

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PREPARED', 'IN_DELIVERY', 'COMPLETED']

function getStepIndex(status: string) {
  return STATUS_ORDER.indexOf(status)
}

export default function TrackPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<TrackOrder | null>(null)
  const [error, setError] = useState('')

  const track = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setOrder(null)
    const res = await fetch(`/api/track/${encodeURIComponent(input.trim().toUpperCase())}`)
    if (!res.ok) { setError('Order not found. Please check the order number and try again.'); setLoading(false); return }
    const d = await res.json()
    setOrder(d.order)
    setLoading(false)
  }

  const currentStep = order ? getStepIndex(order.status) : -1
  const isCancelled = order?.status === 'CANCELLED'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <Truck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Track Your Order</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your order number to see the latest status</p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && track()}
            placeholder="e.g. ORD-20240001"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button onClick={track} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Search className="h-4 w-4" />
            {loading ? '...' : 'Track'}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Result */}
        {order && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
                  {isCancelled ? 'Cancelled' : order.status.replace('_', ' ')}
                </span>
              </div>
            )}

            {/* Progress steps */}
            {!isCancelled && (
              <div className="px-5 py-5">
                <div className="relative">
                  {/* Track line */}
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
              <div className="px-5 py-5 text-center">
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-4">
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
                    <span className="text-gray-700 flex-1 truncate">{item.name}</span>
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
