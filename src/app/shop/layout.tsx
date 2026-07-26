import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ShopPortalNav } from '@/components/shop/nav'
import { ShopBottomNav } from '@/components/shop/bottom-nav'
import { prisma } from '@/lib/db'
import { getShopPluginStatus } from '@/lib/services/plugin.service'
import { getEffectivePlan } from '@/lib/plan-limits'

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/admin/login?callbackUrl=%2Fshop')

  const shopUser = await prisma.shopUser.findFirst({
    where: { userId: session.user.id },
    include: { shop: true },
  })

  if (!shopUser) {
    if (['SUPER_ADMIN', 'ADMIN'].includes((session.user as { role?: string }).role ?? '')) {
      redirect('/admin')
    }
    redirect('/no-shop')
  }

  const shop = shopUser.shop
  const role = shopUser.role

  // Fetch pending orders count for badge
  const pendingCount = await prisma.order.count({
    where: { shopId: shop.id, status: 'PENDING' },
  })

  // Plugins show as individual nav items (owner-only) — locked/disabled ones render greyed out
  const effectivePlan = getEffectivePlan(shop.plan, shop.paymentStatus)
  const plugins = role === 'MANAGER' ? await getShopPluginStatus(shop.id, effectivePlan) : []

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <ShopPortalNav shop={shop} role={role} user={session.user} plugins={plugins} />
      </div>

      {/* Main content — WebkitOverflowScrolling: touch prevents iOS from swallowing taps */}
      <main className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <ShopBottomNav role={role} shopName={shop.name} shopSlug={shop.slug} pendingCount={pendingCount} plugins={plugins} />
    </div>
  )
}
