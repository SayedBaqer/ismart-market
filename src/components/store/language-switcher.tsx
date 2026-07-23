'use client'

import { useRouter } from 'next/navigation'
import type { StoreLang } from '@/lib/i18n/store'

export function LanguageSwitcher({ current, label }: { current: StoreLang; label: string }) {
  const router = useRouter()

  function toggle() {
    const next = current === 'en' ? 'ar' : 'en'
    document.cookie = `store_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shrink-0 min-h-[36px] min-w-[56px] justify-center"
      title="Switch language"
      aria-label={`Switch to ${current === 'en' ? 'Arabic' : 'English'}`}
    >
      <span className="text-sm leading-none">{current === 'en' ? '🇧🇭' : '🇬🇧'}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
