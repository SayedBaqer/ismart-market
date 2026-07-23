'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Package, ArrowRight, Zap } from 'lucide-react'
import type { HomeSection } from '@/lib/services/settings.service'

interface Product {
  id: string; slug: string; name: string; price: number; comparePrice: number | null
  discount: number; images: string[]; category: string | null; inStock: boolean
}

interface Props {
  config: HomeSection['config']
  products: Product[]
  currency: string
}

function Countdown({ endDate }: { endDate: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    function update() {
      const diff = Math.max(0, new Date(endDate).getTime() - Date.now())
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTime({ d, h, m, s })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endDate])

  const pad = (n: number) => String(n).padStart(2, '0')
  const Box = ({ v, l }: { v: string; l: string }) => (
    <div className="flex flex-col items-center">
      <span className="rounded-lg bg-white/20 px-3 py-1.5 text-2xl font-extrabold tabular-nums text-white min-w-[3rem] text-center">{v}</span>
      <span className="mt-1 text-[10px] font-semibold uppercase text-red-200 tracking-wider">{l}</span>
    </div>
  )

  return (
    <div className="flex items-end gap-2">
      {time.d > 0 && <Box v={pad(time.d)} l="Days" />}
      <Box v={pad(time.h)} l="Hours" />
      <span className="mb-2 text-xl font-bold text-white/60">:</span>
      <Box v={pad(time.m)} l="Mins" />
      <span className="mb-2 text-xl font-bold text-white/60">:</span>
      <Box v={pad(time.s)} l="Secs" />
    </div>
  )
}

export function FlashSaleSection({ config, products, currency }: Props) {
  if (products.length === 0) return null
  const title = config?.title ?? 'Flash Sale'
  const badge = config?.badge ?? 'HOT DEAL'
  const endDate = config?.endDate ?? ''
  const expired = endDate && new Date(endDate) <= new Date()
  if (expired) return null

  const fmt = (n: number) => `${n.toFixed(3)} ${currency}`

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-orange-800 py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-400/20 px-3 py-1 text-xs font-bold text-red-200 uppercase tracking-wider">
              <Zap className="h-3 w-3 fill-current" />
              {badge}
            </div>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">{title}</h2>
            <p className="mt-1 text-sm text-red-200">Limited time offers — don&apos;t miss out!</p>
          </div>
          {endDate && <Countdown endDate={endDate} />}
        </div>

        {/* Products */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:border-white/20 hover:shadow-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-white/10">
                {product.images[0] ? (
                  <Image src={product.images[0]} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 640px) 50vw, 25vw" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-12 w-12 text-white/20" />
                  </div>
                )}
                {product.discount > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-extrabold text-white shadow-lg">
                    -{product.discount}%
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                {product.category && (
                  <span className="text-[11px] font-medium uppercase tracking-wider text-red-300">{product.category}</span>
                )}
                <p className="line-clamp-2 text-sm font-semibold text-white leading-snug">{product.name}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <span className="text-base font-extrabold text-red-300">{fmt(product.price)}</span>
                  {product.comparePrice && (
                    <span className="text-xs text-white/40 line-through">{fmt(product.comparePrice)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/products" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition-all">
            See all deals <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
