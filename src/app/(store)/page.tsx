import { prisma } from '@/lib/db'
import { getSetting } from '@/lib/services/settings.service'
import { AdCarousel } from '@/components/store/sections/ad-carousel'
import Image from 'next/image'
import Link from 'next/link'
import { Package, Trophy, Flame, Sparkles, ChevronRight, Store, ArrowRight } from 'lucide-react'
import { getStoreT } from '@/lib/i18n/get-store-lang'
import { t as tc } from '@/lib/i18n/translate-content'

export const revalidate = 60

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(price: unknown, currency: string) {
  return `${Number(price).toFixed(3)} ${currency}`
}

interface Product {
  id: string; slug: string; name: string; meta?: unknown
  price: unknown; comparePrice: unknown
  images: unknown; category: { name: string; meta?: unknown } | null
}

function ProductCard({ p, currency, rank, lang }: { p: Product; currency: string; rank?: number; lang?: string }) {
  const images = Array.isArray(p.images) ? (p.images as string[]) : []
  const price = Number(p.price)
  const compare = p.comparePrice ? Number(p.comparePrice) : null
  const discount = compare && compare > price ? Math.round(((compare - price) / compare) * 100) : 0

  return (
    <Link
      href={`/products/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-lg transition-all duration-200 relative"
    >
      {rank && rank <= 3 && (
        <span className="absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-[11px] font-black text-yellow-900 shadow">
          {rank}
        </span>
      )}
      {discount > 0 && (
        <span className="absolute top-2 right-2 z-10 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
          -{discount}%
        </span>
      )}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {images[0] ? (
          <Image
            src={images[0]} alt={p.name} fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 160px, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-10 w-10 text-gray-200" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 gap-1">
        {p.category && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 leading-none">
            {lang === 'ar' ? tc(p.category.meta, 'name', p.category.name, 'ar') : p.category.name}
          </span>
        )}
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug flex-1 min-h-[2.5rem]">
          {lang === 'ar' ? tc(p.meta, 'name', p.name, 'ar') : p.name}
        </p>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-sm font-bold text-blue-700">{fmt(p.price, currency)}</span>
          {compare && compare > price && (
            <span className="text-xs text-gray-400 line-through">{fmt(compare, currency)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

// Horizontal-scroll on mobile, 4-col grid on sm+
function ProductRow({ products, currency, lang }: { products: Product[]; currency: string; lang?: string }) {
  if (!products.length) return null
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-4 sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0">
      {products.map((p, i) => (
        <div key={p.id} className="w-40 flex-none sm:w-auto">
          <ProductCard p={p} currency={currency} rank={i + 1} lang={lang} />
        </div>
      ))}
    </div>
  )
}

function SectionHeader({ icon, title, href, seeAll }: { icon: React.ReactNode; title: string; href?: string; seeAll?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          {seeAll ?? 'See all'} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const now = new Date()
  const i18n = await getStoreT()
  const lang = i18n.lang

  const [ads, categories, topSellers, onSale, topViewed, newArrivals, topShops, currency, storeName] =
    await Promise.all([
      prisma.advertisement.findMany({
        where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        select: { id: true, title: true, subtitle: true, imageUrl: true, ctaText: true, ctaUrl: true, bgColor: true, textColor: true },
      }).catch(() => []),

      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { displayOrder: 'asc' },
        take: 12,
        select: { id: true, name: true, slug: true, imageUrl: true },
      }).catch(() => []),

      prisma.product.findMany({
        where: { isActive: true, isHidden: false },
        orderBy: { salesCount: 'desc' },
        take: 8,
        select: { id: true, slug: true, name: true, price: true, comparePrice: true, images: true, meta: true, category: { select: { name: true, meta: true } } },
      }).catch(() => []),

      prisma.product.findMany({
        where: { isActive: true, isHidden: false, comparePrice: { not: null } },
        orderBy: { comparePrice: 'desc' },
        take: 8,
        select: { id: true, slug: true, name: true, price: true, comparePrice: true, images: true, meta: true, category: { select: { name: true, meta: true } } },
      }).catch(() => []),

      prisma.product.findMany({
        where: { isActive: true, isHidden: false },
        orderBy: { views: 'desc' },
        take: 8,
        select: { id: true, slug: true, name: true, price: true, comparePrice: true, images: true, meta: true, category: { select: { name: true, meta: true } } },
      }).catch(() => []),

      prisma.product.findMany({
        where: { isActive: true, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, slug: true, name: true, price: true, comparePrice: true, images: true, meta: true, category: { select: { name: true, meta: true } } },
      }).catch(() => []),

      prisma.shop.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, name: true, slug: true, logoUrl: true, description: true, _count: { select: { products: { where: { isActive: true } } } } },
      }).catch(() => []),

      getSetting('currency.base').catch(() => 'BHD'),
      getSetting('company.name').catch(() => 'iSmart Market'),
    ])

  const curr = currency ?? 'BHD'
  const name = storeName ?? 'iSmart Market'

  const hotDeals = onSale.filter(p => p.comparePrice && Number(p.comparePrice) > Number(p.price))

  return (
    <div className="min-h-screen bg-gray-50" dir={i18n.dir}>

      {/* ── Carousel / Hero ─────────────────────────────────────────── */}
      {ads.length > 0 ? (
        <AdCarousel ads={ads} />
      ) : (
        <div className="relative bg-gradient-to-br from-blue-700 to-blue-900 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-2">{i18n.welcome}</p>
              <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">{name}</h1>
              <p className="text-blue-100 text-base mb-6 max-w-md">{i18n.heroSubtitle}</p>
              <Link href="/products"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors">
                {i18n.shopNow} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="hidden sm:grid grid-cols-2 gap-3 shrink-0">
              {topSellers.slice(0, 4).map(p => {
                const imgs = Array.isArray(p.images) ? (p.images as string[]) : []
                return (
                  <div key={p.id} className="h-24 w-24 rounded-xl overflow-hidden bg-white/10">
                    {imgs[0] ? <Image src={imgs[0]} alt={p.name} width={96} height={96} className="object-cover h-full w-full" /> : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Category Quick Access ────────────────────────────────────── */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-start">
              <Link href="/products"
                className="flex flex-col items-center gap-1.5 shrink-0 group">
                <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <span className="text-[11px] font-semibold text-gray-600 whitespace-nowrap">{i18n.allCategories}</span>
              </Link>
              {categories.map((cat) => {
                const catMeta = (cat as { meta?: unknown }).meta
                const catName = lang === 'ar' ? tc(catMeta, 'name', cat.name, 'ar') : cat.name
                return (
                  <Link key={cat.id} href={`/products?category=${cat.slug}`}
                    className="flex flex-col items-center gap-1.5 shrink-0 group">
                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-gray-100 shadow-sm group-hover:scale-105 transition-transform">
                      {(cat as { imageUrl?: string | null }).imageUrl ? (
                        <Image src={(cat as { imageUrl: string }).imageUrl} alt={catName} width={56} height={56} className="object-cover h-full w-full" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                          <span className="text-lg font-black text-blue-400">{catName[0]}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-600 w-16 text-center leading-tight line-clamp-2 break-words">{catName}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">

        {/* ── Best Sellers ─────────────────────────────────────────────── */}
        {topSellers.filter(p => Number(p.price) > 0).length > 0 && (
          <section>
            <SectionHeader icon={<Trophy className="h-5 w-5 text-yellow-500" />} title={i18n.bestSellers} href="/products" seeAll={i18n.seeAll} />
            <ProductRow products={topSellers.filter(p => Number(p.price) > 0)} currency={curr} lang={lang} />
          </section>
        )}

        {/* ── Hot Deals ───────────────────────────────────────────────── */}
        {hotDeals.length > 0 && (
          <section className="-mx-4 sm:mx-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 rounded-3xl py-6 px-4 sm:px-6">
            <SectionHeader icon={<Flame className="h-5 w-5 text-red-500" />} title={i18n.hotDeals} href="/products" seeAll={i18n.seeAll} />
            <ProductRow products={hotDeals} currency={curr} lang={lang} />
          </section>
        )}

        {/* ── Trending ────────────────────────────────────────────────── */}
        {topViewed.filter(p => Number(p.price) > 0).length > 0 && (
          <section>
            <SectionHeader icon={<Flame className="h-5 w-5 text-orange-500" />} title={i18n.trendingNow} href="/products" seeAll={i18n.seeAll} />
            <ProductRow products={topViewed.filter(p => Number(p.price) > 0)} currency={curr} lang={lang} />
          </section>
        )}

        {/* ── Top Shops ───────────────────────────────────────────────── */}
        {topShops.length > 0 && (
          <section>
            <SectionHeader icon={<Store className="h-5 w-5 text-blue-500" />} title={i18n.topShops} href="/shops" seeAll={i18n.seeAll} />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-8 sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0">
              {topShops.map((shop) => (
                <Link key={shop.id} href={`/shops/${shop.slug}`}
                  className="flex flex-col items-center gap-2 w-20 flex-none sm:w-auto group">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden bg-blue-600 relative shadow-sm group-hover:scale-105 transition-transform">
                    {shop.logoUrl ? (
                      <Image src={shop.logoUrl} alt={shop.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-2xl font-black text-white">{shop.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 text-center line-clamp-2 w-full leading-tight break-words">{shop.name}</span>
                  <span className="text-[10px] text-gray-400">{shop._count.products} {i18n.products}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── New Arrivals ─────────────────────────────────────────────── */}
        {newArrivals.filter(p => Number(p.price) > 0).length > 0 && (
          <section>
            <SectionHeader icon={<Sparkles className="h-5 w-5 text-purple-500" />} title={i18n.newArrivals} href="/products" seeAll={i18n.seeAll} />
            <ProductRow products={newArrivals.filter(p => Number(p.price) > 0)} currency={curr} lang={lang} />
          </section>
        )}

        {/* ── Browse All CTA ───────────────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center text-white">
          <h3 className="text-xl font-black mb-2">{i18n.browseAll}</h3>
          <p className="text-blue-100 text-sm mb-5">{i18n.heroSubtitle}</p>
          <Link href="/products"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 transition-colors shadow-lg">
            {i18n.browseAll} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}
