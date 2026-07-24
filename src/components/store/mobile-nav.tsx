'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, Store, User, MapPin } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'

export function MobileNav() {
  const pathname = usePathname()
  const openCart = useCartStore((s) => s.openCart)
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0))

  const NAV = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/products', icon: Search, label: 'Browse' },
    { href: '/shops', icon: Store, label: 'Shops' },
    { href: '/track', icon: MapPin, label: 'Track' },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white sm:hidden">
      <div className="flex h-14 items-center">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}

        {/* Cart button */}
        <button
          onClick={openCart}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-gray-400 hover:text-gray-600 transition-colors relative"
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Cart</span>
        </button>

        {/* Account */}
        <Link
          href="/shop"
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
            pathname.startsWith('/shop') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <User className={`h-5 w-5 ${pathname.startsWith('/shop') ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] font-medium">Account</span>
        </Link>
      </div>
    </nav>
  )
}
