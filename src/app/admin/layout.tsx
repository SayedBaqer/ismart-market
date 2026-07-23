import { auth } from '@/auth'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminTopBar } from '@/components/admin/topbar'
import type { UserRole } from '@prisma/client'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Login page renders inside this layout but without the sidebar.
  // Middleware already handles auth redirects, so we just pass children through
  // for unauthenticated users (which will only be the login page).
  if (!session?.user) {
    return <>{children}</>
  }

  const role = session.user.role as UserRole
  const capabilities = session.user.capabilities as Record<string, boolean>

  return (
    <div className="admin-shell bg-gray-50">
      {/* Sidebar — hidden on mobile, visible md+ */}
      <div className="hidden md:flex shrink-0">
        <AdminSidebar role={role} capabilities={capabilities} />
      </div>
      {/* Column: remove overflow-hidden so it doesn't create an iOS scroll-capture zone */}
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopBar
          user={{
            name: session.user.name,
            email: session.user.email ?? '',
            role: String(role),
          }}
          role={role}
          capabilities={capabilities ?? {}}
        />
        {/* min-h-0 forces flex to respect the constrained height; overflow-auto stays here only */}
        <main className="flex-1 overflow-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
