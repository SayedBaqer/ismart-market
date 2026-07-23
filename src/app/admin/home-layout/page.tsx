'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, Eye, EyeOff, Save, Layout, RefreshCw, CheckCircle2 } from 'lucide-react'

interface Section {
  type: string
  enabled: boolean
  order: number
  config?: Record<string, unknown>
}

const SECTION_META: Record<string, { label: string; desc: string; icon: string }> = {
  'hero': { label: 'Hero Banner', desc: 'Full-width hero with call-to-action', icon: '🖼️' },
  'featured-categories': { label: 'Featured Categories', desc: 'Category grid with icons', icon: '🗂️' },
  'featured-products': { label: 'Featured Products', desc: 'Latest products grid', icon: '📦' },
  'shop-showcase': { label: 'Shop Showcase', desc: 'Top-selling products from shops with shop name', icon: '🏪' },
  'news': { label: 'News & Updates', desc: 'Latest news articles from your blog', icon: '📰' },
  'promotions': { label: 'Promotions', desc: 'Special deals and offers banner', icon: '🎯' },
}

export default function HomeLayoutPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const defaultSections: Section[] = [
    { type: 'hero', enabled: true, order: 0 },
    { type: 'featured-categories', enabled: true, order: 1 },
    { type: 'featured-products', enabled: true, order: 2 },
    { type: 'shop-showcase', enabled: true, order: 3 },
    { type: 'news', enabled: true, order: 4 },
    { type: 'promotions', enabled: false, order: 5 },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      const all = await res.json() as Record<string, string>
      const raw = all['home.sections']
      if (raw) {
        try {
          const parsed: Section[] = JSON.parse(raw)
          // Merge with defaults to pick up any new section types
          const types = new Set(parsed.map((s) => s.type))
          const merged = [
            ...parsed,
            ...defaultSections.filter((d) => !types.has(d.type)),
          ]
          setSections(merged)
        } catch { setSections(defaultSections) }
      } else {
        setSections(defaultSections)
      }
    } else {
      setSections(defaultSections)
    }
    setLoading(false)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  function toggle(type: string) {
    setSections((prev) => prev.map((s) => s.type === type ? { ...s, enabled: !s.enabled } : s))
    setSaved(false)
  }

  function move(type: string, dir: -1 | 1) {
    setSections((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((s) => s.type === type)
      if (idx === -1) return prev
      const target = idx + dir
      if (target < 0 || target >= sorted.length) return prev
      const newSorted = [...sorted]
      const temp = newSorted[idx].order
      newSorted[idx] = { ...newSorted[idx], order: newSorted[target].order }
      newSorted[target] = { ...newSorted[target], order: temp }
      return newSorted
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'home.sections': JSON.stringify(sections) }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const sorted = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Layout className="h-5 w-5 text-blue-600" /> Home Layout
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Control which sections appear on the storefront home page and their order</p>
        </div>
        <Button onClick={save} isLoading={saving} className="gap-2">
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Layout'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((section, idx) => {
            const meta = SECTION_META[section.type] ?? { label: section.type, desc: '', icon: '📄' }
            const isFirst = idx === 0
            const isLast = idx === sorted.length - 1
            return (
              <div
                key={section.type}
                className={`flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition-all ${section.enabled ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-60'}`}
              >
                {/* Drag handle area — up/down buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(section.type, -1)}
                    disabled={isFirst}
                    className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(section.type, 1)}
                    disabled={isLast}
                    className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Icon */}
                <div className="text-2xl select-none">{meta.icon}</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                  <p className="text-xs text-gray-400">{meta.desc}</p>
                </div>

                {/* Order badge */}
                <span className="text-xs font-mono bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                  #{idx + 1}
                </span>

                {/* Toggle */}
                <button
                  onClick={() => toggle(section.type)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${section.enabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {section.enabled ? 'Visible' : 'Hidden'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700">
        <strong>Note:</strong> Changes take effect immediately on the storefront after saving. The home page uses ISR (60-second cache) — changes may take up to 1 minute to appear.
      </div>
    </div>
  )
}
