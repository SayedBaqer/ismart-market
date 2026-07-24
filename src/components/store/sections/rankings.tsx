import Link from 'next/link'
import Image from 'next/image'
import { Package, Trophy, Flame, Tag, Store, ChevronRight } from 'lucide-react'
import { Decimal } from 'decimal.js'

interface Product {
  id: string; slug: string; name: string
  price: unknown; comparePrice: unknown
  images: unknown; category: { name: string } | null
}
interface Shop {
  id: string; name: string; slug: string
  logoUrl: string | null; bannerUrl: string | null
  description: string | null
  _count: { products: number }
}

interface Props {
  topViewed: Product[]
  topSellers: Product[]
  onSale: Product[]
  topShops: Shop[]
  currency: string
}

function fmt(price: unknown, currency: string) {
  return `${new Decimal(String(price)).toFixed(3)} ${currency}`
}

function ProductCard({ p, currency, rank }: { p: Product; currency: string; rank?: number }) {
  const images = Array.isArray(p.images) ? (p.images as string[]) : []
  const price = Number(p.price)
  const compare = p.comparePrice ? Number(p.comparePrice) : null
  const discount = compare && compare > price ? Math.round(((compare - price) / compare) * 100) : 0

  return (
    <Link href={`/products/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-md transition-all relative">
      {rank && rank <= 3 && (
        <div className="absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-yellow-900">{rank}</div>
      )}
      {discount > 0 && (
        <div className="absolute top-2 right-2 z-10 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">-{discount}%</div>
      )}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {images[0] ? (
          <Image src={images[0]} alt={p.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 25vw" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-10 w-10 text-gray-300" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {p.category && <span className="text-[10px] font-medium uppercase tracking-wider text-blue-500 mb-1">{p.category.name}</span>}
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug flex-1">{p.name}</p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <p className="text-sm font-bold text-blue-700">{fmt(p.price, currency)}</p>
          {compare && compare > price && (
            <p className="text-xs text-gray-400 line-through">{fmt(compare, currency)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

function Section({ title, icon, emoji, href, children }: { title: string; icon: React.ReactNode; emoji?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

export function RankingsSection({ topViewed, topSellers, onSale, topShops, currency }: Props) {
  return (
    <div className="space-y-10 py-8">
      {/* Top sellers */}
      {topSellers.some(p => Number(p.price) > 0) && (
        <Section title="Best Sellers" icon={<Trophy className="h-5 w-5 text-yellow-500" />} href="/products?sort=sales">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {topSellers.map((p, i) => <ProductCard key={p.id} p={p} currency={currency} rank={i + 1} />)}
          </div>
        </Section>
      )}

      {/* On sale */}
      {onSale.filter(p => p.comparePrice && Number(p.comparePrice) > Number(p.price)).length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 py-8">
          <Section title="Hot Deals" icon={<Flame className="h-5 w-5 text-red-500" />} href="/products?sale=1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {onSale.filter(p => p.comparePrice && Number(p.comparePrice) > Number(p.price)).map((p) => (
                <ProductCard key={p.id} p={p} currency={currency} />
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Most viewed */}
      {topViewed.some(p => Number(p.price) > 0) && (
        <Section title="Trending Now" icon={<Tag className="h-5 w-5 text-purple-500" />} href="/products?sort=views">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {topViewed.map((p) => <ProductCard key={p.id} p={p} currency={currency} />)}
          </div>
        </Section>
      )}

      {/* Top shops */}
      {topShops.length > 0 && (
        <Section title="Featured Shops" icon={<Store className="h-5 w-5 text-blue-500" />} href="/shops">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {topShops.map(shop => (
              <Link key={shop.id} href={`/shops/${shop.slug}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 hover:border-blue-200 hover:shadow-md transition-all text-center">
                <div className="h-14 w-14 rounded-2xl overflow-hidden bg-blue-600 relative shrink-0 shadow-sm">
                  {shop.logoUrl ? (
                    <Image src={shop.logoUrl} alt={shop.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-xl font-black text-white">{shop.name[0]}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-700">{shop.name}</p>
                  <p className="text-xs text-gray-400">{shop._count.products} items</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
