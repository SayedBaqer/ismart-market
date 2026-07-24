import { StoreHeader } from '@/components/store/header'
import { StoreFooter } from '@/components/store/footer'
import { CartSidebar } from '@/components/store/cart-sidebar'
import { TermsGate } from '@/components/store/terms-gate'
import { LangProvider } from '@/components/store/lang-provider'
import { MobileNav } from '@/components/store/mobile-nav'
import { PwaInstallBanner } from '@/components/pwa-install-banner'
import { getSetting } from '@/lib/services/settings.service'
import { getStoreLang, getStoreT } from '@/lib/i18n/get-store-lang'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [termsRequired, termsContent, termsVersion, storeName, lang, t] = await Promise.all([
    getSetting('legal.terms.required'),
    getSetting('legal.terms.content'),
    getSetting('legal.terms.version'),
    getSetting('company.name'),
    getStoreLang(),
    getStoreT(),
  ])

  return (
    <LangProvider lang={lang} t={t}>
      <div className="flex min-h-screen flex-col">
        <StoreHeader />
        <main className="flex-1 pb-14 sm:pb-0">{children}</main>
        <div className="hidden sm:block">
          <StoreFooter />
        </div>
        <CartSidebar />
        <MobileNav />
        <PwaInstallBanner />
        <TermsGate
          version={parseInt(termsVersion ?? '1', 10)}
          content={termsContent ?? ''}
          required={termsRequired === 'true'}
          storeName={storeName ?? 'Our Store'}
        />
      </div>
    </LangProvider>
  )
}
