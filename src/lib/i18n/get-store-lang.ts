import { cookies } from 'next/headers'
import { storeT } from './store'
import type { StoreLang } from './store'

export async function getStoreLang(): Promise<StoreLang> {
  const jar = await cookies()
  const val = jar.get('store_lang')?.value
  return val === 'ar' ? 'ar' : 'en'
}

export async function getStoreT() {
  const lang = await getStoreLang()
  return storeT[lang]
}
