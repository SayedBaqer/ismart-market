'use client'

import { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight, User, Package, Ban, RefreshCw, Truck, MapPin, Phone, AlertCircle, CheckCircle2 } from 'lucide-react'

const STATUS_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success' | 'destructive' | 'danger'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SHIPPED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/orders/${id}`)
    if (res.ok) {
      const data = await res.json()
      setOrder(data)
      setStatus(data.status)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function setOrderStatus(newStatus: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setOrder((prev: typeof order) => ({ ...prev, status: newStatus }))
      setStatus(newStatus)
      setToast({ msg: `Order marked as ${newStatus.toLowerCase()}`, ok: true })
    } else {
      setToast({ msg: 'Failed to update status', ok: false })
    }
    setSaving(false)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>
  if (!order) return <div className="p-6 text-sm text-red-500">Order not found</div>

  const curr = order.currency ?? 'BHD'
  const addr = order.shippingAddress ?? {}
  const isCancellable = !['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(order.status)
  const isRefundable = order.status === 'COMPLETED'

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/admin/orders" className="hover:text-gray-900">Orders</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-mono font-semibold text-gray-900">{order.orderNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Badge variant={STATUS_COLORS[order.status] ?? 'default'} className="text-sm px-3 py-1">
          {order.status}
        </Badge>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {order.status === 'PENDING' && (
          <Button size="sm" variant="outline" isLoading={saving} onClick={() => setOrderStatus('PROCESSING')}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Mark Processing
          </Button>
        )}
        {order.status === 'PROCESSING' && (
          <Button size="sm" variant="outline" isLoading={saving} onClick={() => setOrderStatus('SHIPPED')}>
            <Truck className="mr-1.5 h-3.5 w-3.5" /> Mark Shipped
          </Button>
        )}
        {order.status === 'SHIPPED' && (
          <Button size="sm" isLoading={saving} onClick={() => setOrderStatus('COMPLETED')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Completed
          </Button>
        )}
        {isCancellable && (
          <Button size="sm" variant="outline" isLoading={saving} onClick={() => {
            if (confirm('Cancel this order?')) setOrderStatus('CANCELLED')
          }} className="border-red-200 text-red-600 hover:bg-red-50">
            <Ban className="mr-1.5 h-3.5 w-3.5" /> Cancel Order
          </Button>
        )}
        {isRefundable && (
          <Button size="sm" variant="outline" isLoading={saving} onClick={() => {
            if (confirm('Mark this order as refunded?')) setOrderStatus('REFUNDED')
          }} className="border-orange-200 text-orange-600 hover:bg-orange-50">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Issue Refund
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{order.customerName ?? order.customer?.displayName ?? 'Guest'}</p>
            {order.customerEmail && <p className="text-gray-500">{order.customerEmail}</p>}
            {order.customer?.mobile && (
              <a href={`tel:${order.customer.mobile}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                <Phone className="h-3.5 w-3.5" /> {order.customer.mobile}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Shipping */}
        {(addr.street || addr.address || addr.city) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" /> Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-0.5">
              {addr.name && <p className="font-medium text-gray-900">{addr.name}</p>}
              {(addr.street || addr.address) && <p>{addr.street ?? addr.address}</p>}
              {addr.city && <p>{[addr.city, addr.governorate].filter(Boolean).join(', ')}</p>}
              {addr.country && <p>{addr.country}</p>}
              {(addr.phone || addr.mobile) && (
                <a href={`tel:${addr.phone ?? addr.mobile}`} className="flex items-center gap-1 text-blue-600 hover:underline pt-1">
                  <Phone className="h-3.5 w-3.5" /> {addr.phone ?? addr.mobile}
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal), curr)}</span>
            </div>
            {Number(order.discountTotal) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>−{formatCurrency(Number(order.discountTotal), curr)}</span>
              </div>
            )}
            {Number(order.taxTotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span>{formatCurrency(Number(order.taxTotal), curr)}</span>
              </div>
            )}
            {Number(order.shippingTotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span>{formatCurrency(Number(order.shippingTotal), curr)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold">
              <span>Grand Total</span>
              <span className="text-blue-700">{formatCurrency(Number(order.grandTotal), curr)}</span>
            </div>
            {order.paymentMethod && (
              <p className="text-xs text-gray-400 pt-1">Payment: {order.paymentMethod}</p>
            )}
          </CardContent>
        </Card>

        {/* Delivery status */}
        {order.deliveryStatus && order.deliveryStatus !== 'NOT_ASSIGNED' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4" /> Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{order.deliveryStatus?.replace(/_/g, ' ')}</p>
              {order.assignedTo && <p className="text-gray-500">Driver: {order.assignedTo.name}</p>}
              {order.deliveredAt && <p className="text-gray-500">Delivered: {new Date(order.deliveredAt).toLocaleString('en-GB')}</p>}
              {order.deliveryNotes && <p className="text-gray-500 italic">{order.deliveryNotes}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" /> Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Product</th>
                  <th className="px-4 py-2 text-right font-medium">Qty</th>
                  <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.lineItems?.map((item: typeof order.lineItems[0]) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.sku && <p className="text-xs font-mono text-gray-400">{item.sku}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">{Number(item.qty)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(Number(item.unitPrice), curr)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(item.lineTotal), curr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {order.notes && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
