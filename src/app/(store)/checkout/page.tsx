'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, cartSubtotal } from '@/lib/store/cart'
import { ShoppingBag, Truck, CreditCard, Building2, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function CheckoutPage() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    line1: '',
    line2: '',
    city: '',
    block: '',
    building: '',
    flat: '',
    paymentMethod: 'cash_on_delivery' as 'cash_on_delivery' | 'bank_transfer' | 'card',
    notes: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subtotal = cartSubtotal(items)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-gray-200" />
        <h2 className="mb-2 text-xl font-semibold text-gray-700">Your cart is empty</h2>
        <Link href="/products" className="mt-4 inline-block text-blue-600 hover:underline">
          Browse Products
        </Link>
      </div>
    )
  }

  async function placeOrder(e?: React.FormEvent) {
    e?.preventDefault()
    if (!form.customerName || !form.customerPhone || !form.line1) {
      setError('Name, phone, and address are required')
      return
    }

    setLoading(true)
    setError('')

    const res = await fetch('/api/store/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: form.customerName,
        customerEmail: form.customerEmail || undefined,
        customerPhone: form.customerPhone,
        shippingAddress: {
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city || undefined,
          block: form.block || undefined,
          building: form.building || undefined,
          flat: form.flat || undefined,
        },
        paymentMethod: form.paymentMethod,
        notes: form.notes || undefined,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Order failed. Please try again.')
      setLoading(false)
      return
    }

    const order = await res.json()
    clearCart()
    router.push(`/order-confirmation?order=${order.orderNumber}`)
  }

  const f = (field: keyof typeof form, value: string) => setForm({ ...form, [field]: value })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      <form onSubmit={placeOrder} className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Contact */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Contact Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Full Name *</label>
                <input
                  required
                  autoComplete="name"
                  value={form.customerName}
                  onChange={(e) => f('customerName', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mohammed Al-Khalid"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Phone *</label>
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={form.customerPhone}
                  onChange={(e) => f('customerPhone', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+973 3xxx xxxx"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Email (optional)</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={form.customerEmail}
                  onChange={(e) => f('customerEmail', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </section>

          {/* Shipping */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <Truck className="h-4 w-4 text-blue-600" /> Delivery Address
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Street / Road *</label>
                <input
                  value={form.line1}
                  onChange={(e) => f('line1', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Street 123, Road 456"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Block</label>
                <input
                  value={form.block}
                  onChange={(e) => f('block', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Block 320"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Building</label>
                <input
                  value={form.building}
                  onChange={(e) => f('building', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Building 12"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Flat / Apartment</label>
                <input
                  value={form.flat}
                  onChange={(e) => f('flat', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Flat 5"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">City / Area</label>
                <input
                  value={form.city}
                  onChange={(e) => f('city', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Manama"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-gray-700">Delivery Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => f('notes', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special delivery instructions…"
              />
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <CreditCard className="h-4 w-4 text-blue-600" /> Payment Method
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: '💵' },
                { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                { value: 'card', label: 'Card (at door)', icon: '💳' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                    form.paymentMethod === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={opt.value}
                    checked={form.paymentMethod === opt.value}
                    onChange={(e) => f('paymentMethod', e.target.value as typeof form.paymentMethod)}
                    className="sr-only"
                  />
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            {form.paymentMethod === 'bank_transfer' && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2">
                <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <p className="text-xs text-blue-700">
                  Bank details will be sent to you after order confirmation. Please transfer before delivery.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right: Order Summary */}
        <div className="space-y-4">
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Order Summary</h2>
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                        sizes="48px"
                        unoptimized={item.imageUrl.startsWith('http')}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                      {item.qty}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.sku}</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">
                    {(item.price * item.qty).toFixed(3)} BHD
                  </p>
                </li>
              ))}
            </ul>

            <div className="my-4 border-t border-gray-100" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(3)} BHD</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
                <span>Total</span>
                <span>{subtotal.toFixed(3)} BHD</span>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Placing Order…' : (
                <>Place Order <ChevronRight className="h-4 w-4" /></>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">
              By placing your order you agree to our terms of service.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
