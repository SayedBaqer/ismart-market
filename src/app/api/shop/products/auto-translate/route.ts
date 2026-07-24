import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * Auto-translate endpoint.
 * Currently uses LibreTranslate (free, self-hostable) if LIBRETRANSLATE_URL is set,
 * otherwise returns empty so the UI falls back to manual entry.
 *
 * To enable: set LIBRETRANSLATE_URL=https://libretranslate.com (or self-hosted instance)
 * Optionally set LIBRETRANSLATE_KEY for the API key.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, description, targetLang } = await req.json() as {
    text?: string; description?: string; targetLang: string
  }

  const url = process.env.LIBRETRANSLATE_URL
  if (!url) {
    return NextResponse.json({ name: null, description: null, note: 'Auto-translate not configured' })
  }

  async function translate(q: string): Promise<string | null> {
    try {
      const r = await fetch(`${url}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q,
          source: 'en',
          target: targetLang,
          format: 'text',
          api_key: process.env.LIBRETRANSLATE_KEY ?? '',
        }),
      })
      if (!r.ok) return null
      const d = await r.json() as { translatedText?: string }
      return d.translatedText ?? null
    } catch { return null }
  }

  const [translatedName, translatedDesc] = await Promise.all([
    text ? translate(text) : Promise.resolve(null),
    description ? translate(description) : Promise.resolve(null),
  ])

  return NextResponse.json({ name: translatedName, description: translatedDesc })
}
