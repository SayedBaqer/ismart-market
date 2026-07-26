'use client'

import { createContext, useContext } from 'react'
import { shopT, type ShopTranslations } from '@/lib/i18n/shop'
import type { StoreLang } from '@/lib/i18n/store'

const ShopLangContext = createContext<StoreLang>('en')
export const ShopLangProvider = ShopLangContext.Provider

/** Current shop-portal language (from the store_lang cookie, set server-side). */
export function useShopLang(): StoreLang {
  return useContext(ShopLangContext)
}

/** Translated strings for the shop portal — see src/lib/i18n/shop.ts. */
export function useShopT(): ShopTranslations {
  return shopT[useShopLang()]
}
