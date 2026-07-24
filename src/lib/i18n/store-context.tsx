'use client'

import { createContext, useContext } from 'react'
import { storeT } from './store'
import type { StoreTranslations } from './store'

const StoreTContext = createContext<StoreTranslations>(storeT.en)

export const StoreTProvider = StoreTContext.Provider

export function useStoreT(): StoreTranslations {
  return useContext(StoreTContext)
}
