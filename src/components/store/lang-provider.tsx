'use client'

import { useEffect } from 'react'
import type { StoreLang } from '@/lib/i18n/store'
import { storeT } from '@/lib/i18n/store'
import { StoreTProvider } from '@/lib/i18n/store-context'

interface Props {
  lang: StoreLang
  children: React.ReactNode
}

// Receives only `lang` (serializable string) from the server.
// Looks up the full translation object client-side to avoid
// serialization errors with function-valued translation entries.
export function LangProvider({ lang, children }: Props) {
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  return <StoreTProvider value={storeT[lang]}>{children}</StoreTProvider>
}
