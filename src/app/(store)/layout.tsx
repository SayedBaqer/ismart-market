import { StoreHeader } from '@/components/store/header'
import { StoreFooter } from '@/components/store/footer'
import { CartSidebar } from '@/components/store/cart-sidebar'
import { TermsGate } from '@/components/store/terms-gate'
import { LangProvider } from '@/components/store/lang-provider'
import { getSetting } from '@/lib/services/settings.service'
import { getStoreLang } from '@/lib/i18n/get-store-lang'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [termsRequired, termsContent, termsVersion, storeName, lang] = await Promise.all([
    getSetting('legal.terms.required'),
    getSetting('legal.terms.content'),
    getSetting('legal.terms.version'),
    getSetting('company.name'),
    getStoreLang(),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <LangProvider lang={lang} />
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
      <CartSidebar />
      <TermsGate
        version={parseInt(termsVersion ?? '1', 10)}
        content={termsContent ?? ''}
        required={termsRequired === 'true'}
        storeName={storeName ?? 'Our Store'}
      />
    </div>
  )
}
