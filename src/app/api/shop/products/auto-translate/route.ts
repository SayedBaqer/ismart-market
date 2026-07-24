import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * Auto-translate endpoint. Provider priority:
 *   1. Google Cloud Translation API v2  → set GOOGLE_TRANSLATE_KEY
 *   2. DeepL Free/Pro API               → set DEEPL_KEY  (free keys end with :fx)
 *   3. LibreTranslate (self-hosted)     → set LIBRETRANSLATE_URL
 * Returns { name: null, description: null } gracefully when no provider is configured.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, description, targetLang } = await req.json() as {
    text?: string; description?: string; targetLang: string
  }

  // ── Google Cloud Translation v2 ──────────────────────────────────────────
  const googleKey = process.env.GOOGLE_TRANSLATE_KEY
  if (googleKey) {
    async function googleTranslate(q: string): Promise<string | null> {
      try {
        const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q, source: 'en', target: targetLang, format: 'text' }),
        })
        if (!r.ok) return null
        const d = await r.json() as { data?: { translations?: { translatedText: string }[] } }
        return d.data?.translations?.[0]?.translatedText ?? null
      } catch { return null }
    }
    const [translatedName, translatedDesc] = await Promise.all([
      text ? googleTranslate(text) : Promise.resolve(null),
      description ? googleTranslate(description) : Promise.resolve(null),
    ])
    return NextResponse.json({ name: translatedName, description: translatedDesc, provider: 'google' })
  }

  // ── DeepL API ────────────────────────────────────────────────────────────
  const deeplKey = process.env.DEEPL_KEY
  if (deeplKey) {
    const deeplLang = targetLang.toUpperCase()
    const baseUrl = deeplKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
    async function deeplTranslate(texts: string[]): Promise<string[]> {
      try {
        const r = await fetch(`${baseUrl}/v2/translate`, {
          method: 'POST',
          headers: { 'Authorization': `DeepL-Auth-Key ${deeplKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: texts, source_lang: 'EN', target_lang: deeplLang }),
        })
        if (!r.ok) return texts.map(() => '')
        const d = await r.json() as { translations?: { text: string }[] }
        return (d.translations ?? []).map((t) => t.text)
      } catch { return texts.map(() => '') }
    }
    const inputs: string[] = []
    if (text) inputs.push(text)
    if (description) inputs.push(description)
    const results = await deeplTranslate(inputs)
    let idx = 0
    const translatedName = text ? results[idx++] || null : null
    const translatedDesc = description ? results[idx] || null : null
    return NextResponse.json({ name: translatedName, description: translatedDesc, provider: 'deepl' })
  }

  // ── LibreTranslate (self-hosted) ─────────────────────────────────────────
  const libreUrl = process.env.LIBRETRANSLATE_URL
  if (libreUrl) {
    async function libreTranslate(q: string): Promise<string | null> {
      try {
        const r = await fetch(`${libreUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q, source: 'en', target: targetLang, format: 'text', api_key: process.env.LIBRETRANSLATE_KEY ?? '' }),
        })
        if (!r.ok) return null
        const d = await r.json() as { translatedText?: string }
        return d.translatedText ?? null
      } catch { return null }
    }
    const [translatedName, translatedDesc] = await Promise.all([
      text ? libreTranslate(text) : Promise.resolve(null),
      description ? libreTranslate(description) : Promise.resolve(null),
    ])
    return NextResponse.json({ name: translatedName, description: translatedDesc, provider: 'libretranslate' })
  }

  return NextResponse.json({
    name: null,
    description: null,
    note: 'Set GOOGLE_TRANSLATE_KEY, DEEPL_KEY, or LIBRETRANSLATE_URL to enable auto-translate',
  })
}
