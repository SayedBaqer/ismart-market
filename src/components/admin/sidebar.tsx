'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { hasCapability } from '@/lib/auth/capabilities'
import type { UserRole } from '@prisma/client'
import type { Capability } from '@/lib/auth/capabilities'
import {
  LayoutDashboard, Package, Tag, BarChart3,
  Users, ShoppingCart, Newspaper, Settings, Plug,
  TrendingUp, Receipt, Warehouse, Building2, LayoutList, ClipboardCheck, Globe,
  PanelLeftClose, PanelLeftOpen, Megaphone, Percent,
} from 'lucide-react'

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  exact?: boolean
  cap?: Capability
  badgeKey?: string
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true, cap: 'products.view' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/admin/products', icon: Package, label: 'Products', cap: 'products.view' },
      { href: '/admin/categories', icon: Tag, label: 'Categories', cap: 'categories.view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/stock', icon: Warehouse, label: 'Stock', cap: 'stock.view' },
      { href: '/admin/orders', icon: ShoppingCart, label: 'Orders', cap: 'orders.view' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { href: '/admin/billing', icon: Receipt, label: 'Documents', cap: 'billing.view' },
      { href: '/admin/customers', icon: Users, label: 'Customers', cap: 'customers.view' },
      { href: '/admin/expenses', icon: TrendingUp, label: 'Expenses', cap: 'billing.view' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/admin/reports', icon: BarChart3, label: 'Reports', cap: 'reports.view' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/advertisements', icon: Megaphone, label: 'Advertisements', cap: 'settings.edit' },
      { href: '/admin/news', icon: Newspaper, label: 'News', cap: 'news.view' },
      { href: '/admin/store', icon: LayoutList, label: 'Store Builder', cap: 'settings.edit' },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { href: '/admin/platform', icon: Globe, label: 'Platform Control', cap: 'settings.edit' },
      { href: '/admin/shops', icon: Building2, label: 'Shops', cap: 'settings.view' },
      { href: '/admin/shops/approvals', icon: ClipboardCheck, label: 'Shop Approvals', cap: 'settings.edit', badgeKey: 'approvals' },
      { href: '/admin/commission', icon: Percent, label: 'Commission & Fees', cap: 'settings.edit' },
      { href: '/admin/commission/ledger', icon: Receipt, label: 'Commission Ledger', cap: 'settings.edit' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/users', icon: Users, label: 'Users', cap: 'users.view' },
      { href: '/admin/plugins', icon: Plug, label: 'Plugins', cap: 'plugins.manage' },
      { href: '/admin/settings', icon: Settings, label: 'Settings', cap: 'settings.view' },
    ],
  },
]

interface Props {
  role: UserRole
  capabilities: Record<string, boolean>
  onNavigate?: () => void
  /** Set false for the mobile drawer copy — it must never collapse to icon-only width
   *  or share the desktop collapse state, since the drawer itself handles open/close. */
  allowCollapse?: boolean
}

export function AdminSidebar({ role, capabilities, onNavigate, allowCollapse = true }: Props) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [badges, setBadges] = useState<Record<string, number>>({})
  const [collapsedState, setCollapsedState] = useState(false)
  const collapsed = allowCollapse && collapsedState

  useEffect(() => { setMounted(true) }, [])

  // Persist collapsed state across sessions (desktop sidebar only)
  useEffect(() => {
    if (!allowCollapse) return
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved === 'true') setCollapsedState(true)
  }, [allowCollapse])

  function toggle() {
    const next = !collapsedState
    setCollapsedState(next)
    localStorage.setItem('admin-sidebar-collapsed', String(next))
  }

  useEffect(() => {
    fetch('/api/admin/shops/approvals')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          const count = (d.pendingDisplays?.length ?? 0) + (d.pendingNews?.length ?? 0)
          if (count > 0) setBadges((b) => ({ ...b, approvals: count }))
        }
      })
      .catch(() => {})
  }, [pathname])

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  function canAccess(cap?: Capability) {
    // Before mount, show all items so server HTML matches the initial client render
    if (!mounted) return true
    if (!cap) return true
    return hasCapability(role, capabilities ?? {}, cap)
  }

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(item.cap)),
    }))
    .filter((group) => group.items.length > 0)

  const w = collapsed ? 'w-14' : 'w-60'

  return (
    <aside className={cn('flex h-full flex-col border-r border-gray-100 bg-white shrink-0 shadow-sm transition-all duration-200', w)}>
      {/* Logo + collapse toggle */}
      <div className="flex h-14 items-center border-b border-gray-100 px-2 gap-1">
        <Link href="/admin" className={cn('flex items-center gap-2.5 group min-w-0 flex-1', collapsed ? 'justify-center' : 'px-2')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-200 transition-shadow group-hover:shadow-blue-300">
            <span className="text-xs font-extrabold text-white tracking-tight">iB</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-none truncate">Portal Admin</p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Management</p>
            </div>
          )}
        </Link>
        {allowCollapse && (
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? 'Pin sidebar open' : 'Collapse sidebar'}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />
            }
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.label && !collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {group.label}
              </p>
            )}
            {group.label && collapsed && (
              <div className="mb-1.5 mx-3 h-px bg-gray-100" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact)
                const Icon = item.icon
                const badge = item.badgeKey ? badges[item.badgeKey] : 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'relative flex items-center rounded-xl text-sm transition-all duration-150',
                      collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5',
                      active
                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {!collapsed && item.label}
                    {badge ? (
                      <span className={cn(
                        'rounded-full text-[10px] font-bold',
                        collapsed
                          ? 'absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center bg-red-500 text-white'
                          : `ml-auto px-1.5 py-0.5 ${active ? 'bg-white/30 text-white' : 'bg-red-500 text-white'}`,
                      )}>
                        {badge > 9 ? '9+' : badge}
                      </span>
                    ) : (!collapsed && active) ? (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Store link */}
      <div className="border-t border-gray-100 p-2">
        <Link
          href="/"
          target="_blank"
          title={collapsed ? 'View Store' : undefined}
          className={cn(
            'flex items-center rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-2 px-3 py-2.5',
          )}
        >
          <Globe className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span>View Store</span>
              <svg className="ml-auto h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </>
          )}
        </Link>
      </div>
    </aside>
  )
}
