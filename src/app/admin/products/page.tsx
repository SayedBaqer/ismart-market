import { getProducts } from '@/lib/services/product.service'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { ToggleActiveButton } from './toggle-button'

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
]

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string; status?: string }>
}) {
  const sp = await searchParams
  const page = Number(sp.page ?? 1)
  const q = sp.q
  const categoryId = sp.category
  const status = sp.status // '', 'true', 'false'

  const isActive = status === 'true' ? true : status === 'false' ? false : undefined

  const { items, total, totalPages } = await getProducts({ search: q, categoryId, isActive, page })

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { q, status, ...overrides }
    if (merged.q) params.set('q', merged.q)
    if (merged.status) params.set('status', merged.status)
    if (overrides.page) params.set('page', overrides.page)
    const s = params.toString()
    return `/admin/products${s ? `?${s}` : ''}`
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products, SKU…"
            className="h-9 rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref({ status: tab.value || undefined, page: undefined })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              (status ?? '') === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 hidden sm:table-cell">SKU</th>
                  <th className="px-4 py-3 hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                      No products found.{' '}
                      <Link href="/admin/products/new" className="text-blue-600 hover:underline">
                        Add your first product
                      </Link>
                    </td>
                  </tr>
                )}
                {items.map((p: typeof items[number]) => {
                  const stock = p.stockMeta?.currentQty ?? 0
                  const threshold = p.stockMeta?.threshold ?? 0
                  const stockColor =
                    stock === 0
                      ? 'text-red-600 bg-red-50'
                      : threshold > 0 && stock <= threshold
                      ? 'text-amber-600 bg-amber-50'
                      : 'text-green-600 bg-green-50'

                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {Array.isArray(p.images) && (p.images as string[]).length > 0 ? (
                          <img
                            src={(p.images as string[])[0]}
                            alt={p.name}
                            className="h-9 w-9 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 hidden sm:table-cell">{p.sku}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(p.price.toString())}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stockColor}`}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ToggleActiveButton id={p.id} isActive={p.isActive} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">
                {total} products · page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildHref({ page: String(page - 1) })}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildHref({ page: String(page + 1) })}>
                    <Button variant="outline" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
