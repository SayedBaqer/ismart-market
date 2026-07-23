import Link from 'next/link'
import { Search, Phone } from 'lucide-react'
import { getSetting } from '@/lib/services/settings.service'
import { CartIcon } from '@/components/store/cart-icon'
import { LanguageSwitcher } from '@/components/store/language-switcher'
import { getStoreLang, getStoreT } from '@/lib/i18n/get-store-lang'
import { prisma } from '@/lib/db'

export async function StoreHeader() {
  const [companyName, phone, categories, lang, t] = await Promise.all([
    getSetting('company.name'),
    getSetting('company.phone'),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { name: 'asc' },
      take: 8,
      select: { id: true, name: true, slug: true },
    }).catch(() => []),
    getStoreLang(),
    getStoreT(),
  ])

  const name = companyName ?? 'Portal'

  return (
    <header className="sticky top-0 z-50 w-full" dir={t.dir}>
      {/* Top bar */}
      {phone && (
        <div className="hidden border-b border-blue-700 bg-blue-800 py-1.5 sm:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <p className="text-xs text-blue-200">{t.welcome} {name}</p>
            <div className="flex items-center gap-1 text-xs text-blue-200">
              <Phone className="h-3 w-3" />
              {phone}
            </div>
          </div>
        </div>
      )}

      {/* Main header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
                <span className="text-xs font-extrabold text-white tracking-tight">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-bold text-gray-900">{name}</span>
            </Link>

            {/* Search — fills remaining space */}
            <form action="/products" method="GET" className="flex-1 min-w-0">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  name="q"
                  type="search"
                  placeholder={t.searchPlaceholder}
                  className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 ps-9 pe-16 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                />
                <button
                  type="submit"
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {t.searchBtn}
                </button>
              </div>
            </form>

            {/* Actions — always visible */}
            <div className="flex items-center gap-2 shrink-0">
              <LanguageSwitcher current={lang} label={t.switchLang} />
              <CartIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Category nav */}
      <nav className="border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Link
            href="/products"
            className="shrink-0 py-2.5 pr-5 text-sm font-semibold text-blue-600 border-b-2 border-blue-600"
          >
            {t.allProducts}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="shrink-0 px-5 py-2.5 text-sm text-gray-600 hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-300"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
