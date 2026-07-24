'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, ShoppingCart, Truck, MoreHorizontal, X,
  Package, Users, FileText, BarChart3, UserPlus, Newspaper,
  Settings, LogOut, Instagram,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

interface Props {
  role: string
  shopName: string
  pendingCount?: number
}

const PRIMARY_TABS = (role: string) => [
  { href: '/shop', label: 'Home', icon: LayoutDashboard, exact: true, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
  { href: '/shop/orders', label: 'Orders', icon: ShoppingCart, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
  { href: '/shop/delivery', label: 'Delivery', icon: Truck, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
].filter((t) => t.roles.includes(role))

const MORE_ITEMS = (role: string) => [
  { href: '/shop/stock', label: 'Stock', icon: Package, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/customers', label: 'Customers', icon: Users, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/analytics', label: 'Analytics', icon: BarChart3, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/billing', label: 'Documents', icon: FileText, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/news', label: 'News & Posts', icon: Newspaper, roles: ['MANAGER', 'STAFF'] },
  { href: '/shop/plugins/instagram', label: 'Instagram', icon: Instagram, roles: ['MANAGER'] },
  { href: '/shop/reports', label: 'Reports', icon: BarChart3, roles: ['MANAGER'] },
  { href: '/shop/users', label: 'Staff Users', icon: UserPlus, roles: ['MANAGER'] },
  { href: '/shop/settings', label: 'Page Builder', icon: Settings, roles: ['MANAGER'] },
].filter((t) => t.roles.includes(role))

export function ShopBottomNav({ role, shopName, pendingCount = 0 }: Props) {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const primaryTabs = PRIMARY_TABS(role)
  const moreItems = MORE_ITEMS(role)

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
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
                <p className="text-xs text-gray-400">More options</p>
              </div>
              <button type="button" onClick={() => setShowMore(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <X className="h-4 w-4" />
              </button>
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
            </div>

            {/* Sign out */}
            <div className="border-t border-gray-100 px-4 pb-6 pt-3">
              <button type="button" onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-semibold">Sign Out</span>
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
                    {label === 'Orders' && pendingCount > 0 && (
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
                <span className="text-[10px] font-semibold">More</span>
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
