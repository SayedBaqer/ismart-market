import Link from 'next/link'
import { getSetting } from '@/lib/services/settings.service'
import { getStoreT } from '@/lib/i18n/get-store-lang'
import { prisma } from '@/lib/db'
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react'

export async function StoreFooter() {
  const [companyName, address, phone, email, categories, t] = await Promise.all([
    getSetting('company.name'),
    getSetting('company.address'),
    getSetting('company.phone'),
    getSetting('company.email'),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { name: 'asc' },
      take: 6,
      select: { name: true, slug: true },
    }).catch(() => []),
    getStoreT(),
  ])

  const name = companyName ?? 'Portal'

  return (
    <footer className="bg-slate-900 text-slate-300" dir={t.dir}>
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700">
                <span className="text-sm font-extrabold text-white">{name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-lg font-bold text-white">{name}</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">{t.tagline}</p>

            {/* Contact */}
            <div className="mt-6 space-y-2.5">
              {address && (
                <div className="flex items-start gap-2.5 text-sm text-slate-400">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-blue-400" />
                  {address}
                </div>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition-colors">
                  <Phone className="h-4 w-4 shrink-0 text-blue-400" />
                  {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition-colors">
                  <Mail className="h-4 w-4 shrink-0 text-blue-400" />
                  {email}
                </a>
              )}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                {t.categories}
              </h4>
              <ul className="space-y-2.5">
                {categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
              {t.quickLinks}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: '/products', label: t.allProductsLink },
                { href: '/order-confirmation', label: t.trackOrder },
                { href: '/register-shop', label: t.openShop },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} {name}. {t.rights}
          </p>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {t.adminPortal}
          </Link>
        </div>
      </div>
    </footer>
  )
}
