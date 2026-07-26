'use client'

import { useCartStore, cartItemCount, selectedSubtotal } from '@/lib/store/cart'
import { X, Minus, Plus, Trash2, ShoppingBag, Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useStoreT } from '@/lib/i18n/store-context'

export function CartSidebar() {
  const items = useCartStore((s) => s.items)
  const isOpen = useCartStore((s) => s.isOpen)
  const closeCart = useCartStore((s) => s.closeCart)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQty = useCartStore((s) => s.updateQty)
  const toggleSelected = useCartStore((s) => s.toggleSelected)
  const t = useStoreT()

  const subtotal = selectedSubtotal(items)
  const count = cartItemCount(items)
  const selectedCount = items.filter((i) => i.selected).length

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm cursor-pointer"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div
        dir={t.dir}
        className={`fixed top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
          t.dir === 'rtl' ? 'left-0' : 'right-0'
        } ${
          isOpen ? 'translate-x-0' : t.dir === 'rtl' ? '-translate-x-full' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="font-semibold text-gray-900">
            {t.cart} {count > 0 && <span className="ms-1 text-sm text-gray-400">({count})</span>}
          </h2>
          <button onClick={closeCart} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-200" />
              <p className="text-sm text-gray-400">{t.emptyCart}</p>
              <button onClick={closeCart} className="mt-4 text-sm text-blue-600 hover:underline">
                {t.continueShopping}
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.productId} className={`flex gap-3 rounded-xl p-1.5 transition-colors ${item.selected ? '' : 'opacity-50'}`}>
                  <button
                    type="button"
                    onClick={() => toggleSelected(item.productId)}
                    title={item.selected ? 'Remove from this order' : 'Include in this order'}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                      item.selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {item.selected && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                        sizes="64px"
                        unoptimized={item.imageUrl.startsWith('http')}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <p className="line-clamp-1 text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.sku}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-gray-200">
                        <button
                          onClick={() => updateQty(item.productId, item.qty - 1)}
                          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50 rounded-s-lg"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.productId, item.qty + 1)}
                          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50 rounded-e-lg"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {(item.price * item.qty).toFixed(3)} BHD
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t.subtotal} ({selectedCount} selected)</span>
              <span className="font-semibold text-gray-900">{subtotal.toFixed(3)} BHD</span>
            </div>
            <p className="text-xs text-gray-400">{t.shippingNote}</p>
            <Link
              href="/checkout"
              onClick={(e) => { if (selectedCount === 0) e.preventDefault(); else closeCart() }}
              aria-disabled={selectedCount === 0}
              className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                selectedCount === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {t.checkout}
            </Link>
            <button
              onClick={closeCart}
              className="block w-full rounded-xl border border-gray-200 py-2.5 text-center text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t.continueShopping}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
