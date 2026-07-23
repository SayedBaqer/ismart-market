import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import { getSetting } from '@/lib/services/settings.service'
import { formatCurrency } from '@/lib/utils'
import { Package, ArrowRight, Sparkles } from 'lucide-react'

export async function FeaturedProductsSection() {
  const currency = (await getSetting('currency.base')) ?? 'BHD'

  const products = await prisma.product.findMany({
    where: { isActive: true, isHidden: false },
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true, slug: true } },
      stockMeta: { select: { currentQty: true } },
    },
  })

  if (products.length === 0) return null

  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Catalogue
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Featured Products
            </h2>
          </div>
          <Link
            href="/products"
            className="group hidden sm:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:text-blue-700"
          >
            View all
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => {
            const images: string[] = Array.isArray(product.images) ? (product.images as string[]) : []
            const thumb = images[0] ?? null
            const price = Number(product.price)
            const comparePrice = product.comparePrice ? Number(product.comparePrice) : null
            const discount = comparePrice && comparePrice > price
              ? Math.round(((comparePrice - price) / comparePrice) * 100)
              : null
            const inStock = !product.trackStock ||
              (product.stockMeta ? Number(product.stockMeta.currentQty) > 0 : true)

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200"
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
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {discount && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                        -{discount}%
                      </span>
                    )}
                    {!inStock && (
                      <span className="rounded-full bg-gray-800/80 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
                        Sold out
                      </span>
                    )}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  {/* Quick view on hover */}
                  <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-blue-600 py-2 text-center text-xs font-semibold text-white transition-transform duration-300 group-hover:translate-y-0">
                    View Product →
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  {product.category && (
                    <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      {product.category.name}
                    </span>
                  )}
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900 leading-snug">
                    {product.name}
                  </p>
                  <div className="mt-auto flex items-center gap-2">
                    <span className="text-base font-bold text-blue-700">
                      {formatCurrency(price, currency)}
                    </span>
                    {comparePrice && comparePrice > price && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatCurrency(comparePrice, currency)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Mobile view all */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            View all products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
