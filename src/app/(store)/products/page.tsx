import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'

interface ProductRow {
  id: string
  name: string
  slug: string
  sku: string
  price: { toString(): string }
  images: unknown
  category: { name: string; slug: string } | null
  createdAt: Date
}
import { getSetting } from '@/lib/services/settings.service'
import { getStoreT } from '@/lib/i18n/get-store-lang'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, SlidersHorizontal } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Products' }

const PAGE_SIZE = 24

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const categorySlug = params.category ?? ''
  const page = Math.max(1, Number(params.page ?? '1'))
  const skip = (page - 1) * PAGE_SIZE

  const [currency, t] = await Promise.all([
    getSetting('currency.base').then((v) => v ?? 'BHD'),
    getStoreT(),
  ])

  // Resolve category slug → id
  let categoryId: string | undefined
  if (categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug } })
    categoryId = cat?.id
  }

  const where = {
    isActive: true,
    isHidden: false,
    ...(q && {
      OR: [
        { name: { contains: q, ...ci() } },
        { sku: { contains: q, ...ci() } },
        { description: { contains: q, ...ci() } },
      ],
    }),
    ...(categoryId && { categoryId }),
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      take: PAGE_SIZE,
      skip,
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true, slug: true } } },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (categorySlug) p.set('category', categorySlug)
    if (page > 1) p.set('page', String(page))
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    const s = p.toString()
    return `/products${s ? `?${s}` : ''}`
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" dir={t.dir}>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar filters */}
        <aside className="w-full shrink-0 lg:w-56">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm mb-4">
              <SlidersHorizontal className="h-4 w-4" />
              {t.filters}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t.category}
              </p>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={buildUrl({ category: undefined, page: undefined })}
                    className={`block rounded-md px-2 py-1 text-sm transition-colors ${
                      !categorySlug
                        ? 'bg-blue-50 font-medium text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t.allCategories}
                  </Link>
                </li>
                {categories.map((cat: { id: string; name: string; slug: string }) => (
                  <li key={cat.id}>
                    <Link
                      href={buildUrl({ category: cat.slug, page: undefined })}
                      className={`block rounded-md px-2 py-1 text-sm transition-colors ${
                        categorySlug === cat.slug
                          ? 'bg-blue-50 font-medium text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search + count */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <form className="flex flex-1 max-w-sm gap-2">
              <input
                name="q"
                defaultValue={q}
                type="search"
                placeholder={t.searchProductsPlaceholder}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t.searchBtn}
              </button>
            </form>
            <p className="text-sm text-gray-500">{t.results(total, q || undefined)}</p>
          </div>

          {/* Grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 py-20 text-center">
              <ShoppingCart className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">{t.noProducts}</p>
              <Link href="/products" className="text-sm text-blue-600 hover:underline">
                {t.clearFilters}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {(products as ProductRow[]).map((product) => {
                const images = (product.images as string[]) ?? []
                const thumb = images[0] ?? null

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-square bg-gray-100">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          <ShoppingCart className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      {product.category && (
                        <span className="text-xs text-gray-400">{product.category.name}</span>
                      )}
                      <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug">
                        {product.name}
                      </p>
                      <p className="mt-auto text-sm font-bold text-blue-700">
                        {formatCurrency(Number(product.price), currency)}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: page > 2 ? String(page - 1) : undefined })}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {t.prev}
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2)
                .map((p) => (
                  <Link
                    key={p}
                    href={buildUrl({ page: p > 1 ? String(p) : undefined })}
                    className={`rounded-lg border px-4 py-2 text-sm ${
                      p === page
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {t.next}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
