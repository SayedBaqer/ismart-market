'use client'

import { useEffect } from 'react'
import type { StoreLang } from '@/lib/i18n/store'

export function LangProvider({ lang }: { lang: StoreLang }) {
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  return null
}
