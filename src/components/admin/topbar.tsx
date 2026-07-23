'use client'

import { useTransition, useState, useEffect, useRef } from 'react'
import { Bell, Menu, X, Home, LogOut, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { AdminSidebar } from '@/components/admin/sidebar'
import { logoutAction } from '@/app/admin/logout/actions'
import type { UserRole } from '@prisma/client'
import type { Capability } from '@/lib/auth/capabilities'

interface Props {
  user: { name?: string | null; email: string; role: string }
  role?: UserRole
  capabilities?: Record<string, boolean>
}

interface Alert {
  type: 'low_stock' | 'new_order'
  message: string
  href: string
}

export function AdminTopBar({ user, role, capabilities }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isPending, startTransition] = useTransition()

  const alertsRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  // Stable refs so the listener captures current state without re-registering
  const showAlertsRef = useRef(false)
  const showUserMenuRef = useRef(false)
  showAlertsRef.current = showAlerts
  showUserMenuRef.current = showUserMenu

  useEffect(() => {
    fetch('/api/admin/alerts')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setAlerts(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  // Close on tap outside — pointerdown fires before click and before scroll capture
  useEffect(() => {
    function handleOutside(e: PointerEvent) {
      // The ref values here are from the PREVIOUS render (before the current tap's setState ran),
      // so when a toggle button fires, its setState hasn't propagated yet → ref is still false →
      // this handler does nothing, letting the dropdown open safely.
      if (showAlertsRef.current && alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setShowAlerts(false)
      }
      if (showUserMenuRef.current && userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [])

  const displayName = user.name ?? user.email
  const initials = displayName[0].toUpperCase()

  // onPointerDown fires before iOS scroll detection can claim the touch —
  // more reliable than onClick for elements inside an overflow:auto sibling on iOS.
  function handleBell(e: React.PointerEvent) {
    e.preventDefault()
    setShowAlerts((v) => !v)
    setShowUserMenu(false)
  }

  function handleUserMenu(e: React.PointerEvent) {
    e.preventDefault()
    setShowUserMenu((v) => !v)
    setShowAlerts(false)
  }

  function handleOpenMenu(e: React.PointerEvent) {
    e.preventDefault()
    setShowMobileMenu(true)
  }

  function handleCloseMenu(e: React.PointerEvent) {
    e.preventDefault()
    setShowMobileMenu(false)
  }

  function handleLogout(e: React.PointerEvent) {
    e.preventDefault()
    startTransition(async () => { await logoutAction() })
  }

  return (
    <>
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-4"
        style={{ position: 'relative', zIndex: 20 }}
      >
        {/* Left: mobile menu + home */}
        <div className="flex items-center gap-1">
          {role && (
            <div
              role="button"
              aria-label="Open menu"
              onPointerDown={handleOpenMenu}
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 select-none"
              style={{ touchAction: 'manipulation', cursor: 'pointer' }}
            >
              <Menu className="h-5 w-5 pointer-events-none" />
            </div>
          )}
          <Link
            href="/admin"
            className="flex h-11 items-center gap-2 rounded-xl px-2 text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            style={{ touchAction: 'manipulation' }}
          >
            <Home className="h-5 w-5 text-blue-600 pointer-events-none" />
            <span className="hidden sm:block text-sm font-semibold text-blue-600">Admin</span>
          </Link>
        </div>

        {/* Right: bell + user */}
        <div className="flex items-center gap-1">

          {/* Notifications */}
          <div className="relative" ref={alertsRef}>
            <div
              role="button"
              aria-label="Notifications"
              onPointerDown={handleBell}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 select-none relative"
              style={{ touchAction: 'manipulation', cursor: 'pointer' }}
            >
              <Bell className="h-5 w-5 pointer-events-none" />
              {alerts.length > 0 && (
                <span className="pointer-events-none absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </div>

            {showAlerts && (
              <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-xl">
                <div className="border-b border-gray-100 px-4 py-2.5">
                  <p className="text-xs font-semibold text-gray-700">Notifications</p>
                </div>
                {alerts.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-gray-400">All clear — no alerts</p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {alerts.map((a, i) => (
                      <li key={i}>
                        <Link
                          href={a.href}
                          onClick={() => setShowAlerts(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
                        >
                          <span className={`pointer-events-none mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                            a.type === 'low_stock' ? 'bg-orange-400' : 'bg-blue-400'
                          }`} />
                          <span className="pointer-events-none text-xs text-gray-700">{a.message}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative" ref={userRef}>
            <div
              role="button"
              aria-label="User menu"
              onPointerDown={handleUserMenu}
              className="flex h-11 items-center gap-2 rounded-xl px-2 text-gray-700 hover:bg-gray-100 active:bg-gray-200 select-none"
              style={{ touchAction: 'manipulation', cursor: 'pointer' }}
            >
              <div className="pointer-events-none flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 shrink-0">
                {initials}
              </div>
              <div className="pointer-events-none hidden sm:flex flex-col items-start">
                <span className="text-xs font-medium text-gray-900 leading-none max-w-[100px] truncate">{displayName}</span>
                <span className="text-[10px] text-gray-400 mt-0.5 capitalize leading-none">{user.role.toLowerCase().replace('_', ' ')}</span>
              </div>
              <ChevronDown className="pointer-events-none hidden sm:block h-3.5 w-3.5 text-gray-400" />
            </div>

            {showUserMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                <div className="pointer-events-none border-b border-gray-100 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
                </div>
                <Link
                  href="/admin"
                  onClick={() => setShowUserMenu(false)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  <Home className="pointer-events-none h-4 w-4 text-gray-400" />
                  Admin Home
                </Link>
                <div
                  role="button"
                  onPointerDown={handleLogout}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 select-none ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                  style={{ touchAction: 'manipulation', cursor: 'pointer' }}
                >
                  <LogOut className="pointer-events-none h-4 w-4" />
                  <span className="pointer-events-none">{isPending ? 'Signing out…' : 'Sign out'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      {showMobileMenu && role && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            role="button"
            aria-label="Close menu"
            onPointerDown={handleCloseMenu}
            className="absolute inset-0 bg-black/40"
            style={{ touchAction: 'manipulation', cursor: 'pointer' }}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 shadow-xl">
            <div
              role="button"
              aria-label="Close"
              onPointerDown={handleCloseMenu}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              style={{ touchAction: 'manipulation', cursor: 'pointer' }}
            >
              <X className="pointer-events-none h-4 w-4" />
            </div>
            <AdminSidebar
              role={role}
              capabilities={(capabilities ?? {}) as Record<Capability, boolean>}
              onNavigate={() => setShowMobileMenu(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
