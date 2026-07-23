import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasCapability, firstAccessibleAdminRoute } from '@/lib/auth/capabilities'
import type { UserRole } from '@prisma/client'

const ADMIN_PREFIX = '/admin'
const API_ADMIN_PREFIX = '/api/admin'
const PUBLIC_ADMIN_ROUTES = ['/admin/login']
const SETUP_ROUTE = '/setup'
const SETUP_API = '/api/setup'

const ROUTE_CAPS: Array<{ prefix: string; cap: Parameters<typeof hasCapability>[2] }> = [
  { prefix: '/admin/products', cap: 'products.view' },
  { prefix: '/admin/categories', cap: 'categories.view' },
  { prefix: '/admin/stock', cap: 'stock.view' },
  { prefix: '/admin/assemblies', cap: 'stock.view' },
  { prefix: '/admin/billing', cap: 'billing.view' },
  { prefix: '/admin/expenses', cap: 'billing.view' },
  { prefix: '/admin/customers', cap: 'customers.view' },
  { prefix: '/admin/reports', cap: 'reports.view' },
  { prefix: '/admin/users', cap: 'users.view' },
  { prefix: '/admin/settings', cap: 'settings.view' },
  { prefix: '/admin/plugins', cap: 'plugins.manage' },
  { prefix: '/admin/news', cap: 'news.view' },
  { prefix: '/admin/home-layout', cap: 'settings.edit' },
  { prefix: '/admin/shop-approvals', cap: 'settings.edit' },
  { prefix: '/admin/shops', cap: 'settings.view' },
]

type AuthSession = {
  user?: {
    role?: string
    capabilities?: Record<string, boolean>
  }
} | null

export default auth(async function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  const session = (req as { auth: AuthSession }).auth

  // Always allow: setup wizard, auth endpoints, and public store routes
  if (
    pathname === SETUP_ROUTE ||
    pathname.startsWith(SETUP_API) ||
    pathname === '/admin/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/icon') ||
    pathname.startsWith('/api/products') ||
    pathname.startsWith('/api/categories') ||
    pathname.startsWith('/api/store') ||
    pathname.startsWith('/api/shops') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/access-suspended' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/no-shop' ||
    pathname.startsWith('/shop') ||
    pathname.startsWith('/api/shop')
  ) {
    return NextResponse.next()
  }

  // Non-admin pages are always accessible
  if (!pathname.startsWith(ADMIN_PREFIX) && !pathname.startsWith(API_ADMIN_PREFIX)) {
    return NextResponse.next()
  }

  // Admin pages: unauthenticated → login (no cookie check — works on all devices)
  if (pathname.startsWith(ADMIN_PREFIX) && !PUBLIC_ADMIN_ROUTES.includes(pathname)) {
    if (!session?.user) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const role = (session.user.role ?? 'STAFF') as UserRole
    const caps = (session.user.capabilities ?? {}) as Record<string, boolean>

    // Redirect /admin root to first accessible page for limited roles
    if (pathname === '/admin' && Object.keys(caps).length > 0) {
      const first = firstAccessibleAdminRoute(role, caps)
      if (first !== '/admin') {
        return NextResponse.redirect(new URL(first, req.url))
      }
    }

    // Enforce route-level capability checks
    for (const { prefix, cap } of ROUTE_CAPS) {
      if (pathname.startsWith(prefix) && !hasCapability(role, caps, cap)) {
        const first = firstAccessibleAdminRoute(role, caps)
        return NextResponse.redirect(new URL(first, req.url))
      }
    }
  }

  // Admin API: unauthenticated → 401
  if (pathname.startsWith(API_ADMIN_PREFIX)) {
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|manifest\\.webmanifest|sw\\.js|uploads/|api/icon|api/icon-192|api/icon-512).*)' ,
  ],
}
