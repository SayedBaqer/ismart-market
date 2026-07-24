'use client'

import { useState } from 'react'
import { Instagram, Plus, Trash2, ArrowRight, ArrowLeft, Package, CheckCircle2, Loader2, Info, ExternalLink } from 'lucide-react'
import Link from 'next/link'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

function isValidIgUrl(url: string) {
  return /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/.test(url)
}

interface PostEntry {
  url: string
  name: string
  description: string
  price: string
  comparePrice: string
  sku: string
}

interface ImportResult { name: string; ok: boolean; error?: string }

const EMPTY: PostEntry = { url: '', name: '', description: '', price: '', comparePrice: '', sku: '' }

const STEPS = [
  { label: 'Add Posts', desc: 'Paste Instagram post URLs' },
  { label: 'Fill Details', desc: 'Name, price & description' },
  { label: 'Import', desc: 'Create products' },
]

export default function InstagramImportPage() {
  const [step, setStep] = useState(0)
  const [posts, setPosts] = useState<PostEntry[]>([{ ...EMPTY }])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [urlErrors, setUrlErrors] = useState<Record<number, string>>({})

  function addPost() { setPosts(p => [...p, { ...EMPTY }]) }
  function removePost(i: number) { setPosts(p => p.filter((_, idx) => idx !== i)) }
  function update(i: number, field: keyof PostEntry, value: string) {
    setPosts(p => p.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
    if (field === 'name' && !posts[i].sku) {
      setPosts(p => p.map((e, idx) => idx === i ? { ...e, name: value, sku: `IG-${slugify(value).slice(0, 20).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}` } : e))
    }
  }

  function validateUrls() {
    const errs: Record<number, string> = {}
    posts.forEach((p, i) => {
      if (!p.url.trim()) errs[i] = 'URL is required'
      else if (!isValidIgUrl(p.url)) errs[i] = 'Must be a valid Instagram post, reel, or video URL'
    })
    setUrlErrors(errs)
    return Object.keys(errs).length === 0
  }

  function nextFromUrls() {
    if (!validateUrls()) return
    // Pre-fill SKUs where missing
    setPosts(p => p.map((e, i) => ({
      ...e,
      sku: e.sku || `IG-${String(i + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    })))
    setStep(1)
  }

  async function doImport() {
    setImporting(true)
    const res: ImportResult[] = []

    for (const post of posts) {
      try {
        const r = await fetch('/api/shop/products/import-instagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instagramUrl: post.url,
            name: post.name || `Instagram Post`,
            description: post.description,
            price: parseFloat(post.price) || 0,
            comparePrice: post.comparePrice ? parseFloat(post.comparePrice) : null,
            sku: post.sku,
          }),
        })
        const d = await r.json()
        res.push({ name: post.name || post.url, ok: r.ok, error: !r.ok ? (d.error ?? 'Failed') : undefined })
      } catch {
        res.push({ name: post.name || post.url, ok: false, error: 'Network error' })
      }
    }

    setResults(res)
    setImporting(false)
    setStep(2)
  }

  const successCount = results.filter(r => r.ok).length

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
          <Instagram className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Instagram Product Import</h1>
          <p className="text-sm text-gray-500">Import products directly from your Instagram posts</p>
        </div>
        <Link href="/shop/plugins/instagram" className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1">
          Instagram Catalog <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className={`text-xs font-semibold truncate ${i === step ? 'text-blue-700' : i < step ? 'text-green-700' : 'text-gray-400'}`}>{s.label}</p>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* ── Step 0: URLs ── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-semibold">How this works</p>
              <p>Paste public Instagram post URLs. You&apos;ll fill in product details on the next step. Products are created in your shop — make sure images are set after import.</p>
            </div>
          </div>

          <div className="space-y-3">
            {posts.map((post, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <div className="relative">
                    <input
                      type="url"
                      value={post.url}
                      onChange={e => update(i, 'url', e.target.value)}
                      placeholder="https://www.instagram.com/p/ABC123/"
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                        urlErrors[i] ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {post.url && isValidIgUrl(post.url) && (
                      <a href={post.url} target="_blank" rel="noopener noreferrer"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {urlErrors[i] && <p className="text-xs text-red-500">{urlErrors[i]}</p>}
                </div>
                {posts.length > 1 && (
                  <button type="button" onClick={() => removePost(i)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 mt-0.5 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={addPost}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
              <Plus className="h-4 w-4" /> Add another post
            </button>
            <button type="button" onClick={nextFromUrls}
              className="ml-auto flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
              Next: Fill Details <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Details ── */}
      {step === 1 && (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                  <Instagram className="h-3.5 w-3.5 text-white" />
                </div>
                <a href={post.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate flex-1 min-w-0">
                  {post.url}
                </a>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Product Name *</label>
                  <input value={post.name} onChange={e => update(i, 'name', e.target.value)}
                    placeholder="e.g. Summer Collection Dress"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Price (BHD) *</label>
                  <input type="number" step="0.001" min="0" value={post.price} onChange={e => update(i, 'price', e.target.value)}
                    placeholder="0.000"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Compare Price (optional)</label>
                  <input type="number" step="0.001" min="0" value={post.comparePrice} onChange={e => update(i, 'comparePrice', e.target.value)}
                    placeholder="0.000"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600">SKU</label>
                  <input value={post.sku} onChange={e => update(i, 'sku', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Description (optional)</label>
                  <textarea rows={2} value={post.description} onChange={e => update(i, 'description', e.target.value)}
                    placeholder="Product description from Instagram caption…"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep(0)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button type="button" onClick={doImport} disabled={importing}
              className="ml-auto flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <><Package className="h-4 w-4" /> Import {posts.length} Product{posts.length !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Results ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 text-center ${successCount === results.length ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${successCount === results.length ? 'bg-green-100' : 'bg-orange-100'}`}>
              {successCount === results.length
                ? <CheckCircle2 className="h-8 w-8 text-green-600" />
                : <Package className="h-8 w-8 text-orange-600" />}
            </div>
            <p className="font-black text-gray-900 text-lg">{successCount} of {results.length} imported</p>
            <p className="text-sm text-gray-500 mt-1">
              {successCount === results.length
                ? 'All products created successfully!'
                : `${results.length - successCount} failed — check errors below`}
            </p>
          </div>

          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${r.ok ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                {r.ok
                  ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  : <div className="h-4 w-4 rounded-full border-2 border-red-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${r.ok ? 'text-green-800' : 'text-red-700'}`}>{r.name}</p>
                  {r.error && <p className="text-xs text-red-500">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setPosts([{ ...EMPTY }]); setResults([]); setStep(0) }}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Import More
            </button>
            <Link href="/shop/stock"
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors text-center">
              Go to Stock
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
