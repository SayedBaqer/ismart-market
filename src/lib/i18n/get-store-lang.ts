import { cookies, headers } from 'next/headers'
import { storeT } from './store'
import type { StoreLang } from './store'

export async function getStoreLang(): Promise<StoreLang> {
  const jar = await cookies()
  const cookie = jar.get('store_lang')?.value
  if (cookie === 'ar' || cookie === 'en') return cookie

  // Auto-detect from browser Accept-Language header
  const hdrs = await headers()
  const accept = hdrs.get('accept-language') ?? ''
  const primary = accept.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (primary === 'ar' || primary.startsWith('ar-')) return 'ar'

  return 'en'
}

export async function getStoreT() {
  const lang = await getStoreLang()
  return storeT[lang]
}
