import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ArrowRight, Grid3x3 } from 'lucide-react'

const CATEGORY_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
  'from-indigo-500 to-indigo-700',
  'from-fuchsia-500 to-fuchsia-700',
]

export async function FeaturedCategoriesSection() {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    take: 8,
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true, isHidden: false } } } } },
  })

  if (categories.length === 0) return null

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Grid3x3 className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Browse</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Shop by Category</h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            All categories <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-transparent"
            >
              {/* Gradient accent top-right */}
              <div
                className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length]} opacity-10 transition-all duration-300 group-hover:opacity-20 group-hover:scale-150`}
              />

              {/* Icon */}
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length]} text-white shadow-sm`}
              >
                <span className="text-base font-extrabold">{cat.name.charAt(0)}</span>
              </div>

              <p className="text-sm font-bold text-gray-900 leading-snug">{cat.name}</p>
              <p className="mt-1 text-xs text-gray-400">
                {cat._count.products} product{cat._count.products !== 1 ? 's' : ''}
              </p>

              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                Browse <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
