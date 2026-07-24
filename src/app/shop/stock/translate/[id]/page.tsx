'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Globe, Save, CheckCircle2, Loader2, ArrowLeft, Sparkles } from 'lucide-react'

interface ProductTranslation {
  id: string; name: string; description: string | null
  translations: Record<string, Record<string, string>>
}

const LANGS = [{ code: 'ar', label: 'العربية', dir: 'rtl', flag: '🇸🇦' }]

export default function TranslatePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [product, setProduct] = useState<ProductTranslation | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('ar')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [autoTranslating, setAutoTranslating] = useState(false)

  useEffect(() => {
    fetch(`/api/shop/products/${id}/translate`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setProduct(d)
        const t = d.translations?.[lang] ?? {}
        setName(t.name ?? '')
        setDescription(t.description ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id, lang])

  function switchLang(l: string) {
    setLang(l)
    if (!product) return
    const t = product.translations?.[l] ?? {}
    setName(t.name ?? '')
    setDescription(t.description ?? '')
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/shop/products/${id}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, name, description }),
    })
    // Update local state
    setProduct(prev => prev ? {
      ...prev,
      translations: { ...prev.translations, [lang]: { name, description } },
    } : prev)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setSaving(false)
  }

  async function autoTranslate() {
    if (!product) return
    setAutoTranslating(true)
    // Use the browser's experimental translation or a simple transliteration
    // For now, call our API which can integrate LibreTranslate / DeepL
    try {
      const res = await fetch('/api/shop/products/auto-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: product.name, targetLang: lang }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d.name) setName(d.name)
        if (d.description) setDescription(d.description)
      }
    } catch { /* auto-translate is best-effort */ }
    setAutoTranslating(false)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-6 text-center text-gray-400">Product not found</div>
    )
  }

  const activeLangMeta = LANGS.find(l => l.code === lang)!

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Translate Product</h1>
            <p className="text-xs text-gray-400 truncate max-w-[220px]">{product.name}</p>
          </div>
        </div>
      </div>

      {/* Language tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        {LANGS.map(l => (
          <button key={l.code} type="button" onClick={() => switchLang(l.code)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all flex-1 justify-center ${lang === l.code ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{l.flag}</span> {l.label}
            {product.translations?.[l.code]?.name && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-0.5" />}
          </button>
        ))}
      </div>

      {/* Source (English) */}
      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">🇬🇧 English (source)</p>
        <p className="text-sm font-semibold text-gray-900">{product.name}</p>
        {product.description && <p className="text-xs text-gray-500">{product.description}</p>}
      </div>

      {/* Auto-translate CTA */}
      <button type="button" onClick={autoTranslate} disabled={autoTranslating}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 py-3 text-sm font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 transition-colors">
        {autoTranslating ? <><Loader2 className="h-4 w-4 animate-spin" /> Translating…</> : <><Sparkles className="h-4 w-4" /> Auto-Translate to {activeLangMeta.label}</>}
      </button>

      {/* Translation inputs */}
      <div dir={activeLangMeta.dir} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">Product Name ({activeLangMeta.label})</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setSaved(false) }}
            placeholder={`Name in ${activeLangMeta.label}…`}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            dir={activeLangMeta.dir}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Description ({activeLangMeta.label})</label>
          <textarea
            rows={4}
            value={description}
            onChange={e => { setDescription(e.target.value); setSaved(false) }}
            placeholder={`Description in ${activeLangMeta.label}…`}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            dir={activeLangMeta.dir}
          />
        </div>
      </div>

      <button type="button" onClick={save} disabled={saving || (!name && !description)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-200">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> :
         saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> :
         <><Save className="h-4 w-4" /> Save {activeLangMeta.label} Translation</>}
      </button>

      <p className="text-center text-xs text-gray-400">
        Translations appear automatically when customers browse in that language. No approval needed.
      </p>
    </div>
  )
}
