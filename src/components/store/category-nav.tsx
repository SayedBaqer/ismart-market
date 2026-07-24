'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface Category {
  id: string
  name: string
  slug: string
}

export function CategoryNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSlug = searchParams.get('category') ?? ''
  const isProductsPage = pathname === '/products'

  function navClass(active: boolean) {
    return `shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
      <Link
        href="/products"
        className={navClass(isProductsPage && !activeSlug)}
      >
        All
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/products?category=${cat.slug}`}
          className={navClass(isProductsPage && activeSlug === cat.slug)}
        >
          {cat.name}
        </Link>
      ))}
    </div>
  )
}
