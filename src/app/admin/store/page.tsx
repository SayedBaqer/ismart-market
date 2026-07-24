'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ChevronUp, ChevronDown, Eye, EyeOff, Save, ExternalLink,
  Megaphone, Layout, BarChart2, Grid3X3, Flame, Sparkles,
  Zap, Package, Image as ImageIcon, Store, Newspaper, RefreshCw,
  GripVertical, Settings2, CheckCircle2, Globe,
} from 'lucide-react'
import type { HomeSection, HomeSectionType } from '@/lib/services/settings.service'

const SECTION_META: Record<HomeSectionType, {
  label: string; desc: string
  Icon: React.ComponentType<{ className?: string }>
  color: string; gradient: string; preview: string
}> = {
  'announcement-bar': { label: 'Announcement Bar', desc: 'Scrolling ticker at the top', Icon: Megaphone, color: 'text-blue-600', gradient: 'from-blue-500 to-cyan-500', preview: '📢 ——— Free delivery on all orders ——— New collection out now ———' },
  'hero':             { label: 'Hero Banner',       desc: 'Full-width welcome section', Icon: Layout, color: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-600', preview: '[ BIG TITLE ] Shop the best deals · [Shop Now] [Browse]' },
  'stats-bar':        { label: 'Stats Bar',         desc: 'Live platform metrics strip', Icon: BarChart2, color: 'text-teal-600', gradient: 'from-teal-500 to-emerald-500', preview: '📦 1,240 Products · 👥 8,500 Customers · ✅ 3,200 Orders' },
  'featured-categories': { label: 'Categories',    desc: 'Category image grid', Icon: Grid3X3, color: 'text-violet-600', gradient: 'from-violet-500 to-pink-500', preview: '[Electronics] [Fashion] [Home] [Sports] [Beauty]' },
  'best-sellers':     { label: 'Best Sellers',      desc: 'Top products by sales volume', Icon: Flame, color: 'text-orange-600', gradient: 'from-orange-500 to-red-500', preview: '🏆 #1 ·#2 · #3 · #4 — sorted by revenue' },
  'new-arrivals':     { label: 'New Arrivals',      desc: 'Recently added products', Icon: Sparkles, color: 'text-indigo-600', gradient: 'from-blue-500 to-indigo-600', preview: '✨ NEW · NEW · NEW · NEW — added this week' },
  'flash-sale':       { label: 'Flash Sale',        desc: 'Countdown + discounted items', Icon: Zap, color: 'text-red-600', gradient: 'from-red-600 to-orange-500', preview: '⚡ SALE ENDS IN: 02:14:38 · -20% · -35% · -50%' },
  'featured-products':{ label: 'Featured Products', desc: 'Curated product spotlight', Icon: Package, color: 'text-blue-600', gradient: 'from-blue-500 to-sky-500', preview: '⭐ Handpicked products you want to highlight' },
  'custom-banner':    { label: 'Custom Banner',     desc: 'Image or gradient call-to-action', Icon: ImageIcon, color: 'text-pink-600', gradient: 'from-pink-500 to-rose-600', preview: '[ Your Message ] → [ Shop Now ]   (full-width)' },
  'shop-showcase':    { label: 'Shop Showcase',     desc: 'Top products across all shops', Icon: Store, color: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600', preview: '🏪 Best from: Shop A · Shop B · Shop C' },
  'news':             { label: 'News & Blog',       desc: 'Latest published news posts', Icon: Newspaper, color: 'text-gray-600', gradient: 'from-gray-500 to-slate-600', preview: '📰 Platform updates, stories, announcements' },
  'promotions':       { label: 'Promotions',        desc: 'Custom promotional content', Icon: Megaphone, color: 'text-gray-400', gradient: 'from-gray-400 to-gray-500', preview: '(Custom promotional area)' },
}

const ALL_TYPES: HomeSectionType[] = [
  'announcement-bar', 'hero', 'stats-bar', 'featured-categories',
  'best-sellers', 'new-arrivals', 'flash-sale', 'featured-products',
  'custom-banner', 'shop-showcase', 'news',
]

export default function AdminStorePage() {
  const [sections, setSections] = useState<HomeSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState<HomeSectionType | null>(null)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/store/sections')
      const data = await res.json()
      if (data.value) {
        const raw = data.value
        const parsed: HomeSection[] = typeof raw === 'string' ? JSON.parse(raw) : (raw as HomeSection[])
        const existing = new Map(parsed.map((s) => [s.type, s]))
        const merged = ALL_TYPES.map((type, i) => existing.get(type) ?? { type, enabled: false, order: i, config: {} })
        merged.sort((a, b) => a.order - b.order)
        setSections(merged)
      } else {
        setSections(ALL_TYPES.map((type, i) => ({ type, enabled: i < 5, order: i, config: {} })))
      }
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/store/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sections),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  function toggle(type: HomeSectionType) {
    setSections((prev) => prev.map((s) => s.type === type ? { ...s, enabled: !s.enabled } : s))
  }

  function moveUp(i: number) {
    if (i === 0) return
    setSections((prev) => {
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next.map((s, idx) => ({ ...s, order: idx }))
    })
  }

  function moveDown(i: number) {
    setSections((prev) => {
      if (i >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next.map((s, idx) => ({ ...s, order: idx }))
    })
  }

  function updateConfig(type: HomeSectionType, key: string, value: unknown) {
    setSections((prev) => prev.map((s) =>
      s.type === type ? { ...s, config: { ...s.config, [key]: value } } : s
    ))
  }

  function updateMessages(type: HomeSectionType, raw: string) {
    updateConfig(type, 'messages', raw.split('\n').map((l) => l.trim()).filter(Boolean))
  }

  const enabledCount = sections.filter((s) => s.enabled).length

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-full bg-gray-50/30">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Store Builder</h1>
            <p className="text-xs text-gray-500 mt-0.5">{enabledCount} of {sections.length} sections visible on the homepage</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${showPreview ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
              <Globe className="h-3.5 w-3.5" /> {showPreview ? 'Hide Previews' : 'Show Previews'}
            </button>
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <ExternalLink className="h-3.5 w-3.5" /> Preview Store
            </a>
            <button type="button" onClick={load}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={save} disabled={saving}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}</>}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-2xl mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mx-auto max-w-2xl p-6 space-y-3">
        {/* Page order visual hint */}
        <div className="flex items-center gap-2 text-xs text-gray-400 pb-1">
          <div className="flex-1 border-t border-dashed border-gray-200" />
          <span>Top of Page ↓ Drag to reorder sections</span>
          <div className="flex-1 border-t border-dashed border-gray-200" />
        </div>

        {sections.map((section, i) => {
          const meta = SECTION_META[section.type]
          if (!meta) return null
          const { label, desc, Icon, color, gradient, preview } = meta
          const isExpanded = expanded === section.type

          return (
            <div key={section.type}
              className={`group rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
                section.enabled
                  ? 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  : 'border-gray-100 opacity-55 hover:opacity-70'
              } ${isExpanded ? 'ring-2 ring-blue-200 ring-offset-1' : ''}`}>

              {/* Main row */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                {/* Drag handle + reorder */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <GripVertical className="h-4 w-4 text-gray-200 group-hover:text-gray-400 transition-colors mb-0.5 cursor-grab" />
                  <button type="button" onClick={() => moveUp(i)} disabled={i === 0}
                    className="flex h-4 w-4 items-center justify-center rounded text-gray-200 hover:text-gray-500 disabled:opacity-0 transition-all">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => moveDown(i)} disabled={i === sections.length - 1}
                    className="flex h-4 w-4 items-center justify-center rounded text-gray-200 hover:text-gray-500 disabled:opacity-0 transition-all">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Gradient icon */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${section.enabled ? 'text-gray-900' : 'text-gray-500'}`}>{label}</p>
                  <p className="text-xs text-gray-400 truncate">{desc}</p>
                </div>

                {/* Order badge */}
                <div className="hidden sm:flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-400">
                  {i + 1}
                </div>

                {/* Config button */}
                <button type="button" onClick={() => setExpanded(isExpanded ? null : section.type)}
                  className={`hidden sm:flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${isExpanded ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}>
                  <Settings2 className="h-3 w-3" />
                  {isExpanded ? 'Close' : 'Config'}
                </button>

                {/* Toggle */}
                <button type="button" onClick={() => toggle(section.type)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${section.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  role="switch" aria-checked={section.enabled}>
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${section.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Preview strip */}
              {showPreview && section.enabled && (
                <div className={`mx-4 mb-3 rounded-xl bg-gradient-to-r ${gradient} bg-opacity-10 px-3 py-2 text-[11px] text-white font-medium truncate opacity-80`}
                  style={{ background: `linear-gradient(to right, ${gradient.includes('blue') ? 'rgba(59,130,246,0.12)' : 'rgba(100,100,100,0.08)'}, transparent)`, color: 'inherit' }}>
                  <span className={`${color} font-mono text-[11px]`}>{preview}</span>
                </div>
              )}

              {/* Config panel */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50 to-white px-4 py-4 rounded-b-2xl">
                  <SectionConfig section={section} updateConfig={updateConfig} updateMessages={updateMessages} />
                </div>
              )}
            </div>
          )
        })}

        {/* Bottom of page hint */}
        <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
          <div className="flex-1 border-t border-dashed border-gray-200" />
          <span>Bottom of Page</span>
          <div className="flex-1 border-t border-dashed border-gray-200" />
        </div>

        {/* Save footer */}
        <div className="sticky bottom-4 flex justify-center pt-2">
          <button type="button" onClick={save} disabled={saving}
            className={`flex items-center gap-2 rounded-2xl px-8 py-3 text-sm font-bold shadow-lg transition-all disabled:opacity-50 ${saved ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5'}`}>
            {saved ? <><CheckCircle2 className="h-4 w-4" /> Changes Saved & Published</> : <><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save & Publish'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionConfig({
  section, updateConfig, updateMessages,
}: {
  section: HomeSection
  updateConfig: (type: HomeSectionType, key: string, value: unknown) => void
  updateMessages: (type: HomeSectionType, raw: string) => void
}) {
  const cfg = section.config ?? {}
  const up = (key: string, val: unknown) => updateConfig(section.type, key, val)

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}
        {hint && <span className="ml-1 font-normal text-gray-400">({hint})</span>}
      </label>
      {children}
    </div>
  )

  const Input = ({ k, placeholder, type = 'text' }: { k: string; placeholder?: string; type?: string }) => (
    <input type={type} value={String(cfg[k as keyof typeof cfg] ?? '')} onChange={(e) => up(k, e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
  )

  const NumberInput = ({ k, placeholder, min = 1, max = 20 }: { k: string; placeholder?: string; min?: number; max?: number }) => (
    <input type="number" min={min} max={max} value={Number(cfg[k as keyof typeof cfg] ?? '')}
      onChange={(e) => up(k, parseInt(e.target.value) || min)} placeholder={placeholder}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
  )

  const ColorField = ({ k, defaultVal, label: lbl }: { k: string; defaultVal: string; label: string }) => (
    <Field label={lbl}>
      <div className="flex gap-2">
        <input type="color" value={String(cfg[k as keyof typeof cfg] ?? defaultVal)} onChange={(e) => up(k, e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 p-1 shrink-0" />
        <Input k={k} placeholder={defaultVal} />
      </div>
    </Field>
  )

  switch (section.type) {
    case 'announcement-bar':
      return (
        <div className="space-y-3">
          <Field label="Messages" hint="one per line">
            <textarea rows={4} value={(cfg.messages ?? []).join('\n')}
              onChange={(e) => updateMessages(section.type, e.target.value)}
              placeholder={"Free delivery on orders over 10 BHD\nNew arrivals every week!"}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ColorField k="bgColor" defaultVal="#1e40af" label="Background" />
            <ColorField k="textColor" defaultVal="#ffffff" label="Text color" />
            <Field label="Scroll speed" hint="px/sec"><NumberInput k="speed" placeholder="40" min={10} max={100} /></Field>
          </div>
        </div>
      )

    case 'best-sellers':
    case 'new-arrivals':
    case 'featured-products':
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section title"><Input k="title" placeholder={section.type === 'best-sellers' ? 'Best Sellers' : 'New Arrivals'} /></Field>
          <Field label="Products shown"><NumberInput k="count" placeholder="8" min={2} max={20} /></Field>
          {section.type === 'best-sellers' && (
            <Field label="Sales period">
              <select value={String(cfg.period ?? '30')} onChange={(e) => up('period', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </Field>
          )}
        </div>
      )

    case 'flash-sale':
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title"><Input k="title" placeholder="Flash Sale" /></Field>
          <Field label="Badge text"><Input k="badge" placeholder="HOT DEAL" /></Field>
          <Field label="Sale ends at">
            <input type="datetime-local" value={String(cfg.endDate ?? '')} onChange={(e) => up('endDate', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </Field>
          <Field label="Products shown"><NumberInput k="count" placeholder="6" min={2} max={12} /></Field>
          <p className="col-span-2 text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Shows products where Compare Price &gt; Regular Price.
          </p>
        </div>
      )

    case 'custom-banner':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title"><Input k="title" placeholder="Special Offer" /></Field>
            <Field label="Subtitle"><Input k="subtitle" placeholder="Limited time deals" /></Field>
            <Field label="Button text"><Input k="ctaText" placeholder="Shop Now" /></Field>
            <Field label="Button link"><Input k="ctaUrl" placeholder="/products" /></Field>
          </div>
          <Field label="Background image URL" hint="leave empty for gradient">
            <Input k="imageUrl" placeholder="https://…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ColorField k="bgFrom" defaultVal="#0f172a" label="Gradient start" />
            <ColorField k="bgTo" defaultVal="#1e3a5f" label="Gradient end" />
          </div>
        </div>
      )

    case 'hero':
      return (
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
          Hero content is pulled from <strong>Settings → Company</strong> (name, tagline, contact). Edit those there.
        </div>
      )

    case 'stats-bar':
      return <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-xs text-teal-700">Stats are calculated live from your product, customer, and order counts. No config needed.</div>

    case 'featured-categories':
      return <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-xs text-violet-700">Shows your active parent categories. Manage them in <strong>Catalogue → Categories</strong>.</div>

    case 'shop-showcase':
      return <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-700">Shows top-selling products across all active shops in the last 30 days.</div>

    case 'news':
      return <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600">Shows your 3 latest published news posts. Manage in <strong>Content → News</strong>.</div>

    default:
      return <p className="text-xs text-gray-400">No configuration available for this section.</p>
  }
}
