'use client'

import { useEffect } from 'react'
import type { StoreLang, StoreTranslations } from '@/lib/i18n/store'
import { StoreTProvider } from '@/lib/i18n/store-context'

interface Props {
  lang: StoreLang
  t: StoreTranslations
  children: React.ReactNode
}

export function LangProvider({ lang, t, children }: Props) {
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  return <StoreTProvider value={t}>{children}</StoreTProvider>
}
