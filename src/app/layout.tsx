import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getSetting } from '@/lib/services/settings.service'
import { PwaRegister } from '@/components/pwa-register'

// Prevent static generation — this layout reads DB settings at request time
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const name = (await getSetting('company.name')) ?? 'ibird Portal'
  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description: `${name} — Professional E-Commerce & Business Management`,
    manifest: '/manifest.json',
    icons: { apple: '/api/icon-192' },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [dir, lang, theme] = await Promise.all([
    getSetting('locale.direction'),
    getSetting('locale.language'),
    getSetting('theme.preset'),
  ])

  return (
    <html
      lang={lang ?? 'en'}
      dir={dir ?? 'ltr'}
      data-theme={theme ?? 'blue'}
      suppressHydrationWarning
    >
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
