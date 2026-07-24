'use client'

import { useEffect } from 'react'

export function ProductViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch(`/api/products/${slug}/view`, { method: 'POST' }).catch(() => {})
  }, [slug])

  return null
}
