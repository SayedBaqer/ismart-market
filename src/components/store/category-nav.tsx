'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { t as tc } from '@/lib/i18n/translate-content'
import { useStoreT } from '@/lib/i18n/store-context'
import type { StoreLang } from '@/lib/i18n/store'

interface Category {
  id: string
  name: string
  slug: string
  meta?: unknown
}

interface Props {
  categories: Category[]
  lang: StoreLang
}

export function CategoryNav({ categories, lang }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSlug = searchParams.get('category') ?? ''
  const isProductsPage = pathname === '/products'
  const storeT = useStoreT()

  function navClass(active: boolean) {
    return `shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
      <Link href="/products" className={navClass(isProductsPage && !activeSlug)}>
        {storeT.navAll}
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/products?category=${cat.slug}`}
          className={navClass(isProductsPage && activeSlug === cat.slug)}
        >
          {tc(cat.meta, 'name', cat.name, lang)}
        </Link>
      ))}
    </div>
  )
}
