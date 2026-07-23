import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Decimal } from 'decimal.js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency — BHD uses 3 decimal places
export function formatCurrency(
  amount: number | string | Decimal,
  currency = 'BHD',
): string {
  const num = typeof amount === 'object' ? amount.toNumber() : Number(amount)
  return new Intl.NumberFormat('en-BH', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'BHD' ? 3 : 2,
    maximumFractionDigits: currency === 'BHD' ? 3 : 2,
  }).format(num)
}

export function formatDate(date: Date | string, locale = 'en-BH'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

// Auto-SKU: detect prefix + width from existing SKUs (e.g. IB-0156 → IB-0157)
export function nextSku(existingSkus: string[]): string {
  if (!existingSkus.length) return 'IB-0001'

  const parsed = existingSkus
    .map((sku) => {
      const m = sku.match(/^([A-Za-z\-_]*)(\d+)$/)
      return m ? { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length } : null
    })
    .filter(Boolean) as { prefix: string; num: number; width: number }[]

  if (!parsed.length) return 'IB-0001'

  parsed.sort((a, b) => b.num - a.num)
  const { prefix, num, width } = parsed[0]
  return `${prefix}${String(num + 1).padStart(width, '0')}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}
