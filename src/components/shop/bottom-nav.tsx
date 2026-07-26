'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, ShoppingCart, Truck, MoreHorizontal, X,
  Package, Box, Users, FileText, BarChart3, UserPlus, Newspaper,
  Settings, LogOut, Puzzle, Store, KeyRound, Globe2, Lock, PowerOff, Languages,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { PLUGIN_ROUTES } from '@/lib/plugin-routes'
import { PLUGIN_ICONS, type ShopPluginStatus } from '@/components/shop/plugin-icons'
import { shopT, type ShopTranslations } from '@/lib/i18n/shop'
import type { StoreLang } from '@/lib/i18n/store'

interface Props {
  role: string
  shopName: string
  shopSlug: string
  pendingCount?: number
  plugins?: ShopPluginStatus[]
  lang: StoreLang
}

const PRIMARY_TABS = (role: string, t: ShopTranslations) => [
  { href: '/shop', label: t.navHome, icon: LayoutDashboard, exact: true, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
  { href: '/shop/orders', label: t.navOrders, icon: ShoppingCart, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
  { href: '/shop/delivery', label: t.navDelivery, icon: Truck, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
].filter((tab) => tab.roles.includes(role))

const MORE_ITEMS = (role: string, t: ShopTranslations) => [
  { href: '/shop/profile', label: t.navShopProfile, icon: Store, roles: ['MANAGER'] },
  { href: '/shop/products', label: t.navProducts, icon: Box, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/stock', label: t.navStock, icon: Package, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/customers', label: t.navCustomers, icon: Users, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/analytics', label: t.navAnalytics, icon: BarChart3, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/billing', label: t.navDocuments, icon: FileText, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/news', label: t.navNews, icon: Newspaper, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/reports', label: t.navReports, icon: BarChart3, roles: ['MANAGER'] },
  { href: '/shop/users', label: t.navStaffUsers, icon: UserPlus, roles: ['MANAGER'] },
  { href: '/shop/settings', label: t.navPageBuilder, icon: Settings, roles: ['MANAGER'] },
  { href: '/shop/account', label: t.navMyAccount, icon: KeyRound, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
].filter((item) => item.roles.includes(role))

export function ShopBottomNav({ role, shopName, shopSlug, pendingCount = 0, plugins = [], lang }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const t = shopT[lang]
  const primaryTabs = PRIMARY_TABS(role, t)
  const moreItems = MORE_ITEMS(role, t)
  const showPlugins = role === 'MANAGER' && plugins.length > 0

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  function toggleLang() {
    const next = lang === 'en' ? 'ar' : 'en'
    document.cookie = `store_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    router.refresh()
  }

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900">{shopName}</p>
                <p className="text-xs text-gray-400">{t.navMoreOptions}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={toggleLang}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Languages className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setShowMore(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Grid of items */}
            <div className="grid grid-cols-4 gap-0 px-2 py-4">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href} onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${active ? 'bg-blue-600 shadow-md shadow-blue-200' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <span className={`text-[11px] font-semibold text-center leading-tight ${active ? 'text-blue-700' : 'text-gray-600'}`}>{label}</span>
                  </Link>
                )
              })}

              {/* Individual plugins — greyed if locked (plan too low) or turned off */}
              {showPlugins && plugins.map((plugin) => {
                const Icon = (plugin.icon && PLUGIN_ICONS[plugin.icon]) || Puzzle
                const dimmed = plugin.locked || !plugin.enabled
                const href = dimmed ? '/shop/plugins' : (PLUGIN_ROUTES[plugin.slug] ?? '/shop/plugins')
                const active = !dimmed && isActive(PLUGIN_ROUTES[plugin.slug] ?? '\0')
                return (
                  <Link key={plugin.slug} href={href} onClick={() => setShowMore(false)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <div className={`relative flex h-11 w-11 items-center justify-center rounded-2xl ${active ? 'bg-blue-600 shadow-md shadow-blue-200' : dimmed ? 'bg-gray-100' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${active ? 'text-white' : dimmed ? 'text-gray-300' : 'text-gray-600'}`} />
                      {plugin.locked && <Lock className="absolute -right-1 -bottom-1 h-3.5 w-3.5 text-gray-400 bg-white rounded-full p-0.5" />}
                      {!plugin.locked && !plugin.enabled && <PowerOff className="absolute -right-1 -bottom-1 h-3.5 w-3.5 text-gray-400 bg-white rounded-full p-0.5" />}
                    </div>
                    <span className={`text-[11px] font-semibold text-center leading-tight ${active ? 'text-blue-700' : dimmed ? 'text-gray-400' : 'text-gray-600'}`}>{plugin.name}</span>
                  </Link>
                )
              })}
              {showPlugins && (
                <Link href="/shop/plugins" onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors ${isActive('/shop/plugins') ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isActive('/shop/plugins') ? 'bg-blue-600 shadow-md shadow-blue-200' : 'bg-gray-100'}`}>
                    <Puzzle className={`h-5 w-5 ${isActive('/shop/plugins') ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className={`text-[11px] font-semibold text-center leading-tight ${isActive('/shop/plugins') ? 'text-blue-700' : 'text-gray-600'}`}>{t.navManagePlugins}</span>
                </Link>
              )}
            </div>

            {/* Platform links + sign out */}
            <div className="border-t border-gray-100 px-4 pb-6 pt-3 space-y-1">
              <a href={`/shops/${shopSlug}`} target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors">
                <Store className="h-4 w-4" />
                <span className="text-sm font-semibold">{t.navViewShopPage}</span>
              </a>
              <a href="/" target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors">
                <Globe2 className="h-4 w-4" />
                <span className="text-sm font-semibold">{t.navViewPlatformHome}</span>
              </a>
              <button type="button" onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-semibold">{t.navSignOut}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        {/* Safe area background */}
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-2xl shadow-black/10"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center">
            {primaryTabs.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link key={href} href={href}
                  className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-all ${active ? 'text-blue-600' : 'text-gray-400 active:text-blue-400'}`}>
                  <div className={`relative flex h-7 w-7 items-center justify-center rounded-xl transition-all ${active ? 'bg-blue-100' : ''}`}>
                    <Icon className="h-5 w-5" />
                    {href === '/shop/orders' && pendingCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${active ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
                </Link>
              )
            })}

            {/* More tab */}
            {moreItems.length > 0 && (
              <button type="button" onClick={() => setShowMore(true)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-all ${showMore ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${showMore ? 'bg-blue-100' : ''}`}>
                  <MoreHorizontal className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold">{t.navMore}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom padding so content isn't hidden behind nav */}
      <div className="h-20 md:hidden" />
    </>
  )
}
