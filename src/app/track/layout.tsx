import { StoreHeader } from '@/components/store/header'
import { CartSidebar } from '@/components/store/cart-sidebar'
import { MobileNav } from '@/components/store/mobile-nav'
import { PwaInstallBanner } from '@/components/pwa-install-banner'

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader />
      <main className="flex-1 pb-14 sm:pb-0">{children}</main>
      <CartSidebar />
      <MobileNav />
      <PwaInstallBanner />
    </div>
  )
}
