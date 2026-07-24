import type { StoreLang } from './store'

/**
 * Reads a translated value from a Prisma JSON meta field.
 * Stored as: meta.translations.ar.name / meta.translations.ar.description
 * Falls back to the original field if no translation exists.
 *
 * Usage:
 *   const name = getTranslated(product.meta, 'name', lang) ?? product.name
 */
export function getTranslated(
  meta: unknown,
  field: string,
  lang: StoreLang,
): string | null {
  if (lang === 'en') return null // 'en' is always the base content
  if (!meta || typeof meta !== 'object') return null
  const m = meta as Record<string, unknown>
  const translations = m.translations
  if (!translations || typeof translations !== 'object') return null
  const langBlock = (translations as Record<string, unknown>)[lang]
  if (!langBlock || typeof langBlock !== 'object') return null
  const value = (langBlock as Record<string, unknown>)[field]
  return typeof value === 'string' && value.trim() ? value : null
}

/**
 * Returns a translated or fallback string for a product/category.
 */
export function t(
  meta: unknown,
  field: string,
  fallback: string,
  lang: StoreLang,
): string {
  return getTranslated(meta, field, lang) ?? fallback
}

/**
 * Merges a translation update into existing meta.
 * Call this when saving a translation in an API route.
 */
export function mergeTranslation(
  existingMeta: unknown,
  lang: StoreLang,
  fields: Record<string, string>,
): Record<string, unknown> {
  const base = (typeof existingMeta === 'object' && existingMeta !== null
    ? existingMeta
    : {}) as Record<string, unknown>

  const translations = (base.translations && typeof base.translations === 'object'
    ? base.translations
    : {}) as Record<string, unknown>

  const langBlock = (translations[lang] && typeof translations[lang] === 'object'
    ? translations[lang]
    : {}) as Record<string, unknown>

  return {
    ...base,
    translations: {
      ...translations,
      [lang]: {
        ...langBlock,
        ...Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined)
        ),
      },
    },
  }
}
