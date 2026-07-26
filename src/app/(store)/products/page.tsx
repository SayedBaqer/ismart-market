import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'
import { getSetting } from '@/lib/services/settings.service'
import { getStoreT, getStoreLang } from '@/lib/i18n/get-store-lang'
import { t as tc } from '@/lib/i18n/translate-content'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, Package } from 'lucide-react'
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

  const [currency, t, lang] = await Promise.all([
    getSetting('currency.base').then((v) => v ?? 'BHD'),
    getStoreT(),
    getStoreLang(),
  ])

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
      include: { category: { select: { name: true, slug: true, meta: true } } },
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
    <div className="min-h-screen bg-gray-50" dir={t.dir}>

      {/* ── Mobile search + category pills ─────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        {/* Search bar */}
        <div className="px-4 pt-3 pb-2">
          <form className="flex gap-2">
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            <input
              name="q"
              defaultValue={q}
              type="search"
              placeholder={t.searchProductsPlaceholder}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            <button type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shrink-0">
              {t.searchBtn}
            </button>
          </form>
        </div>

        {/* Category pills — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 pb-3">
          <Link
            href={buildUrl({ category: undefined, page: undefined })}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              !categorySlug
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.allCategories}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildUrl({ category: cat.slug, page: undefined })}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                categorySlug === cat.slug
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tc(cat.meta, 'name', cat.name, lang)}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:px-8">
        <div className="flex gap-6 lg:items-start">

          {/* ── Desktop sidebar ─────────────────────────────────────── */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-32 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">{t.category}</p>
              <ul className="space-y-0.5">
                <li>
                  <Link href={buildUrl({ category: undefined, page: undefined })}
                    className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
                      !categorySlug ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    {t.allCategories}
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link href={buildUrl({ category: cat.slug, page: undefined })}
                      className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
                        categorySlug === cat.slug ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      {tc(cat.meta, 'name', cat.name, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ── Product grid ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {total} {t.lang === 'ar' ? 'منتج' : total === 1 ? 'product' : 'products'}
                {q && <span className="text-gray-400"> for &ldquo;{q}&rdquo;</span>}
              </p>
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
                <ShoppingCart className="h-12 w-12 text-gray-300" />
                <div>
                  <p className="text-sm font-semibold text-gray-500">{t.noProducts}</p>
                  <Link href="/products" className="text-sm text-blue-600 hover:underline mt-1 block">
                    {t.clearFilters}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => {
                  const images = (product.images as string[]) ?? []
                  const thumb = images[0] ?? null

                  return (
                    <Link key={product.id} href={`/products/${product.slug}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                      <div className="relative aspect-square bg-gray-100 overflow-hidden">
                        {thumb ? (
                          <Image src={thumb} alt={product.name} fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-10 w-10 text-gray-200" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        {product.category && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                            {tc(product.category.meta, 'name', product.category.name, lang)}
                          </span>
                        )}
                        <p className="line-clamp-2 text-sm font-semibold text-gray-900 leading-snug flex-1">{product.name}</p>
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
              <div className="mt-8 flex justify-center gap-2 flex-wrap">
                {page > 1 && (
                  <Link href={buildUrl({ page: page > 2 ? String(page - 1) : undefined })}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                    {t.prev}
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2)
                  .map((p) => (
                    <Link key={p} href={buildUrl({ page: p > 1 ? String(p) : undefined })}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                        p === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}>
                      {p}
                    </Link>
                  ))}
                {page < totalPages && (
                  <Link href={buildUrl({ page: String(page + 1) })}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                    {t.next}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
