'use client'

import { useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'

interface Props {
  productId: string
  name: string
  sku: string
  price: number
  imageUrl: string | null
  inStock: boolean
  labels?: { addToCart?: string; outOfStock?: string; added?: string }
}

export function AddToCartButton({ productId, name, sku, price, imageUrl, inStock, labels }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const [qty, setQty] = useState(1)

  function handleAdd() {
    addItem({ productId, name, sku, price, imageUrl }, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (!inStock) {
    return (
      <div className="flex h-12 items-center justify-center rounded-xl bg-gray-100 text-sm font-medium text-gray-400">
        {labels?.outOfStock ?? 'Out of Stock'}
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div className="flex items-center rounded-xl border border-gray-200">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="flex h-12 w-10 items-center justify-center text-gray-500 hover:text-gray-800 text-lg"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-medium">{qty}</span>
        <button
          onClick={() => setQty((q) => q + 1)}
          className="flex h-12 w-10 items-center justify-center text-gray-500 hover:text-gray-800 text-lg"
        >
          +
        </button>
      </div>

      <button
        onClick={handleAdd}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-all ${
          added
            ? 'bg-green-500'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
      >
        {added ? (
          <>
            <Check className="h-4 w-4" /> {labels?.added ?? 'Added!'}
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" /> {labels?.addToCart ?? 'Add to Cart'}
          </>
        )}
      </button>
    </div>
  )
}
