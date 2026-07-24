'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  FileText, Truck, BarChart3, LogOut, Store, Menu, X, Settings, Newspaper, Instagram,
} from 'lucide-react'
import { useState } from 'react'

interface ShopNavProps {
  shop: { id: string; name: string; logoUrl: string | null }
  role: string
  user: { name?: string | null; email?: string | null }
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Owner',
  STAFF: 'Sales',
  CASHIER: 'Delivery',
}

function navItems(role: string) {
  const base = `/shop`
  const all = [
    { href: base, label: 'Dashboard', icon: LayoutDashboard, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
    { href: `${base}/orders`, label: 'Orders', icon: ShoppingCart, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
    { href: `${base}/delivery`, label: 'Delivery Board', icon: Truck, roles: ['MANAGER', 'STAFF', 'CASHIER'] },
    { href: `${base}/stock`, label: 'Stock', icon: Package, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/customers`, label: 'Customers', icon: Users, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/billing`, label: 'Documents', icon: FileText, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/analytics`, label: 'Analytics', icon: BarChart3, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/reports`, label: 'Reports', icon: BarChart3, roles: ['MANAGER'] },
    { href: `${base}/users`, label: 'Staff Users', icon: Users, roles: ['MANAGER'] },
    { href: `${base}/news`, label: 'News & Posts', icon: Newspaper, roles: ['MANAGER', 'STAFF'] },
    { href: `${base}/plugins/instagram`, label: 'Instagram', icon: Instagram, roles: ['MANAGER'] },
    { href: `${base}/settings`, label: 'Page Builder', icon: Settings, roles: ['MANAGER'] },
  ]
  return all.filter((item) => item.roles.includes(role))
}

export function ShopPortalNav({ shop, role, user }: ShopNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const items = navItems(role)

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{shop.name}</p>
          <p className="text-xs text-white/60">{ROLE_LABELS[role] ?? role}</p>
        </div>
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
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
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
