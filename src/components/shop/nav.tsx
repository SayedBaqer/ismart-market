'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, ShoppingCart, Package, Box, Users,
  FileText, Truck, BarChart3, LogOut, Store, Settings, Newspaper, Puzzle, KeyRound, Globe2,
  Lock, PowerOff, Languages,
} from 'lucide-react'
import { useState } from 'react'
import { PLUGIN_ROUTES } from '@/lib/plugin-routes'
import { PLUGIN_ICONS, type ShopPluginStatus } from '@/components/shop/plugin-icons'
import { shopT, type ShopTranslations } from '@/lib/i18n/shop'
import type { StoreLang } from '@/lib/i18n/store'

interface ShopNavProps {
  shop: { id: string; name: string; logoUrl: string | null; slug: string }
  role: string
  user: { name?: string | null; email?: string | null }
  plugins?: ShopPluginStatus[]
  lang: StoreLang
}

function navItems(role: string, t: ShopTranslations) {
  const base = `/shop`
  const all = [
    { href: base, label: t.navDashboard, icon: LayoutDashboard, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
    { href: `${base}/orders`, label: t.navOrders, icon: ShoppingCart, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
    { href: `${base}/delivery`, label: t.navDeliveryBoard, icon: Truck, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
    { href: `${base}/products`, label: t.navProducts, icon: Box, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/stock`, label: t.navStock, icon: Package, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/customers`, label: t.navCustomers, icon: Users, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/billing`, label: t.navDocuments, icon: FileText, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/analytics`, label: t.navAnalytics, icon: BarChart3, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/reports`, label: t.navReports, icon: BarChart3, roles: ['MANAGER'] },
    { href: `${base}/users`, label: t.navStaffUsers, icon: Users, roles: ['MANAGER'] },
    { href: `${base}/news`, label: t.navNews, icon: Newspaper, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/profile`, label: t.navShopProfile, icon: Store, roles: ['MANAGER'] },
    { href: `${base}/settings`, label: t.navPageBuilder, icon: Settings, roles: ['MANAGER'] },
    { href: `${base}/account`, label: t.navMyAccount, icon: KeyRound, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
  ]
  return all.filter((item) => item.roles.includes(role))
}

export function ShopPortalNav({ shop, role, user, plugins = [], lang }: ShopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const t = shopT[lang]
  const items = navItems(role, t)
  const roleLabel = role === 'MANAGER' ? t.roleOwner : role === 'STAFF' ? t.roleSales : role === 'CASHIER' ? t.roleDelivery : role

  function toggleLang() {
    const next = lang === 'en' ? 'ar' : 'en'
    document.cookie = `store_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    router.refresh()
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">{shop.name}</p>
          <p className="text-xs text-white/60">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={toggleLang}
          title="Switch language"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
        >
          <Languages className="h-4 w-4" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/shop' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Individual plugins — each shows as its own item once registered; greyed if locked/off */}
        {role === 'MANAGER' && plugins.length > 0 && (
          <>
            <div className="my-2 mx-3 h-px bg-white/10" />
            {plugins.map((plugin) => {
              const Icon = (plugin.icon && PLUGIN_ICONS[plugin.icon]) || Puzzle
              const href = plugin.locked || !plugin.enabled ? '/shop/plugins' : (PLUGIN_ROUTES[plugin.slug] ?? '/shop/plugins')
              const active = !plugin.locked && plugin.enabled && pathname.startsWith(PLUGIN_ROUTES[plugin.slug] ?? '\0')
              const dimmed = plugin.locked || !plugin.enabled
              return (
                <Link
                  key={plugin.slug}
                  href={href}
                  onClick={() => setOpen(false)}
                  title={plugin.locked ? t.navRequiresPlan.replace('{plan}', plugin.minPlan) : !plugin.enabled ? t.navDisabledTapEnable : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-white text-blue-700 shadow-sm'
                      : dimmed
                      ? 'text-white/40 hover:bg-white/5 hover:text-white/60'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{plugin.name}</span>
                  {plugin.locked && <Lock className="h-3 w-3 shrink-0" />}
                  {!plugin.locked && !plugin.enabled && <PowerOff className="h-3 w-3 shrink-0" />}
                </Link>
              )
            })}
            <Link
              href="/shop/plugins"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                pathname === '/shop/plugins'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Puzzle className="h-4 w-4 shrink-0" />
              {t.navManagePlugins}
            </Link>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 mb-2">
          <div className="h-7 w-7 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {(user.name ?? user.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user.name ?? 'User'}</p>
            <p className="text-xs text-white/50 truncate">{user.email}</p>
          </div>
        </div>
        <a
          href={`/shops/${shop.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Store className="h-4 w-4" />
          {t.navViewShopPage}
        </a>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Globe2 className="h-4 w-4" />
          {t.navViewPlatformHome}
        </a>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t.navSignOut}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-gradient-to-b from-blue-700 to-blue-800 h-full shrink-0">
        <NavContent />
      </aside>

      {/* Mobile: no top bar — bottom nav handles it */}
    </>
  )
}
