import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import { getSetting } from '@/lib/services/settings.service'
import { formatCurrency } from '@/lib/utils'
import { Store, Package, TrendingUp } from 'lucide-react'

export async function ShopShowcaseSection() {
  const [currency, mode] = await Promise.all([
    getSetting('currency.base'),
    getSetting('platform.mode'),
  ])

  // Only show in marketplace mode (multiple shops) or if explicitly enabled
  const showcaseEnabled = await getSetting('home.shopShowcase.enabled')
  if (showcaseEnabled === 'false') return null

  // Get active shops
  const shops = await prisma.shop.findMany({
    where: { status: 'ACTIVE' },
    take: 6,
    select: { id: true, name: true, slug: true, logoUrl: true, description: true },
  })

  if (shops.length === 0) return null

  // Get top-selling products per shop (recent orders in last 30 days)
  const since = new Date()
  since.setDate(since.getDate() - 30)

  // Fetch top products from order items grouped by product, for active shops
  const shopIds = shops.map((s) => s.id)

  const topItems = await prisma.orderItem.findMany({
    where: {
      order: {
        shopId: { in: shopIds },
        createdAt: { gte: since },
        status: { not: 'CANCELLED' },
      },
    },
    include: {
      product: {
        select: { id: true, name: true, slug: true, price: true, images: true, shopId: true },
      },
      order: { select: { shopId: true } },
    },
  })

  // Aggregate qty sold per product
  const productSales = new Map<string, { product: typeof topItems[0]['product']; shopId: string; qty: number }>()
  for (const item of topItems) {
    if (!item.product) continue
    const pid = item.product.id
    const existing = productSales.get(pid)
    if (existing) {
      existing.qty += Number(item.qty)
    } else {
      productSales.set(pid, { product: item.product, shopId: item.order.shopId ?? '', qty: Number(item.qty) })
    }
  }

  // Sort by qty sold, take top 8
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)

  if (topProducts.length === 0) return null

  const shopMap = new Map(shops.map((s) => [s.id, s]))

  return (
    <section className="bg-gray-50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                {mode === 'marketplace' ? 'Top Sellers Across Shops' : 'Trending Now'}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              {mode === 'marketplace' ? 'Shop Spotlight' : 'Best Sellers'}
            </h2>
          </div>
          {mode === 'marketplace' && (
            <Link href="/shops" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">
              All shops →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {topProducts.map(({ product, shopId, qty }) => {
            if (!product) return null
            const shop = shopMap.get(shopId)
            const images = Array.isArray(product.images) ? (product.images as string[]) : []
            const thumb = images[0] ?? null
            const price = Number(product.price)

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-200"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  {/* Sold badge */}
                  <div className="absolute left-2 top-2">
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                      {qty} sold
                    </span>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-emerald-600 py-2 text-center text-xs font-semibold text-white transition-transform duration-300 group-hover:translate-y-0">
                    View Product →
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  {shop && (
                    <div className="flex items-center gap-1">
                      {shop.logoUrl ? (
                        <Image src={shop.logoUrl} alt={shop.name} width={14} height={14} className="rounded-full object-cover" />
                      ) : (
                        <Store className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{shop.name}</span>
                    </div>
                  )}
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900 leading-snug">
                    {product.name}
                  </p>
                  <div className="mt-auto">
                    <span className="text-base font-bold text-emerald-700">
                      {formatCurrency(price, currency ?? 'BHD')}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
