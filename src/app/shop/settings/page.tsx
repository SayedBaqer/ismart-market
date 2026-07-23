'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ChevronUp, ChevronDown, Eye, EyeOff, Save, Clock,
  CheckCircle2, XCircle, AlertCircle, Settings, Store,
  Instagram, MessageCircle, Facebook, Music2,
} from 'lucide-react'

interface DisplaySection {
  type: string
  enabled: boolean
  order: number
  config?: Record<string, unknown>
}

interface DisplayConfig {
  sections: DisplaySection[]
  banner: string | null
  tagline: string
  status?: string
  submittedAt?: string
  approvedAt?: string
  rejectedAt?: string
  reviewNote?: string
}

const SECTION_META: Record<string, { label: string; desc: string; icon: string }> = {
  'announcement-bar': { label: 'Announcement Bar', desc: 'Scrolling text banner at the top of your shop', icon: '📢' },
  'top-sellers':      { label: 'Top Sellers', desc: 'Your best-selling products this month', icon: '🏆' },
  'new-arrivals':     { label: 'New Arrivals', desc: 'Recently added products to your shop', icon: '✨' },
  'recent-sales':     { label: 'Recently Sold', desc: 'Products sold in the last 7 days', icon: '⚡' },
  'featured':         { label: 'Featured Products', desc: 'Hand-picked products you want to highlight', icon: '⭐' },
  'categories':       { label: 'Categories', desc: 'Browse products by category', icon: '🗂️' },
  'about':            { label: 'About Shop', desc: 'Your shop story and description', icon: '🏪' },
}

const ALL_SECTION_TYPES = [
  'announcement-bar', 'top-sellers', 'new-arrivals', 'recent-sales', 'featured', 'categories', 'about',
]

export default function ShopSettingsPage() {
  const [shopName, setShopName] = useState('')
  const [display, setDisplay] = useState<DisplayConfig | null>(null)
  const [pending, setPending] = useState<DisplayConfig | null>(null)
  const [sections, setSections] = useState<DisplaySection[]>(
    ALL_SECTION_TYPES.map((type, i) => ({ type, enabled: ['top-sellers','new-arrivals','categories'].includes(type), order: i, config: {} }))
  )
  const [banner, setBanner] = useState('')
  const [tagline, setTagline] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [instagram, setInstagram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [facebook, setFacebook] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [savingSocial, setSavingSocial] = useState(false)
  const [savedSocial, setSavedSocial] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shop/display')
      if (res.ok) {
        const data = await res.json()
        setShopName(data.shopName ?? '')
        if (data.display) {
          setDisplay(data.display)
          const saved = data.display.sections ?? []
          const existing = new Map(saved.map((s: DisplaySection) => [s.type, s]))
          setSections(ALL_SECTION_TYPES.map((type, i) => (existing.get(type) as DisplaySection) ?? { type, enabled: false, order: i, config: {} }))
          setBanner(data.display.banner ?? '')
          setTagline(data.display.tagline ?? '')
          setAnnouncement((data.display.sections?.find((s: DisplaySection) => s.type === 'announcement-bar')?.config?.text as string) ?? '')
        }
        if (data.displayPending) setPending(data.displayPending)
      }
      const socialRes = await fetch('/api/shop/social-links')
      if (socialRes.ok) {
        const socialData = await socialRes.json()
        const links = socialData.socialLinks ?? {}
        setInstagram(links.instagram ?? '')
        setWhatsapp(links.whatsapp ?? '')
        setFacebook(links.facebook ?? '')
        setTiktok(links.tiktok ?? '')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(type: string) {
    setSections((prev) => prev.map((s) => s.type === type ? { ...s, enabled: !s.enabled } : s))
    setSaved(false)
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

  function updateSectionConfig(type: string, key: string, value: unknown) {
    setSections((prev) => prev.map((s) =>
      s.type === type ? { ...s, config: { ...s.config, [key]: value } } : s
    ))
  }

  async function save() {
    setSaving(true)
    const sectionsToSave = sections.map((s) => {
      if (s.type === 'announcement-bar') return { ...s, config: { ...s.config, text: announcement } }
      return s
    })
    const res = await fetch('/api/shop/display', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: sectionsToSave, banner, tagline }),
    })
    if (res.ok) {
      const data = await res.json()
      setPending(data.displayPending)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function saveSocial() {
    setSavingSocial(true)
    const res = await fetch('/api/shop/social-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instagram, whatsapp, facebook, tiktok }),
    })
    if (res.ok) {
      setSavedSocial(true)
      setTimeout(() => setSavedSocial(false), 2500)
    }
    setSavingSocial(false)
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 md:pb-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Page Builder</h1>
            <p className="text-xs text-gray-500">{shopName} · Changes require super admin approval</p>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Submitting…' : saved ? '✓ Submitted!' : 'Submit for Approval'}
        </button>
      </div>

      {/* Status banners */}
      {pending && (
        <StatusBanner
          status={pending.status}
          submittedAt={pending.submittedAt}
          reviewNote={pending.reviewNote}
        />
      )}
      {display?.status === 'approved' && !pending && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Live display approved on {new Date(display.approvedAt ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      )}

      {/* Section builder */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Store className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Shop Page Sections</h2>
          <span className="ml-auto text-xs text-gray-400">Reorder · Toggle · Configure</span>
        </div>
        <div className="divide-y divide-gray-50">
          {sections.map((sec, i) => {
            const meta = SECTION_META[sec.type]
            if (!meta) return null
            const isExpanded = expanded === sec.type
            return (
              <div key={sec.type} className={`transition-opacity ${sec.enabled ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="flex h-5 w-5 items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => moveDown(i)} disabled={i === sections.length - 1} className="flex h-5 w-5 items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-xl w-7 shrink-0 text-center">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
                  </div>
                  {hasConfig(sec.type) && (
                    <button type="button" onClick={() => setExpanded(isExpanded ? null : sec.type)} className="text-xs text-blue-600 hover:underline px-2 py-1">
                      {isExpanded ? 'Close' : 'Config'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(sec.type)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${sec.enabled ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >
                    {sec.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <SectionConfig
                      section={sec}
                      announcement={announcement}
                      setAnnouncement={setAnnouncement}
                      updateConfig={updateSectionConfig}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tagline */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Shop Tagline</h2>
        <input
          value={tagline}
          onChange={(e) => { setTagline(e.target.value); setSaved(false) }}
          placeholder="e.g. Bahrain's trusted electronics store"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Banner */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Shop Banner Image URL</h2>
        <input
          value={banner}
          onChange={(e) => { setBanner(e.target.value); setSaved(false) }}
          placeholder="https://example.com/banner.jpg"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="banner preview" className="w-full h-28 object-cover rounded-xl border border-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
      </div>

      {/* Social links */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Social Links</h2>
            <p className="text-xs text-gray-400">Saves instantly — no approval needed</p>
          </div>
          <button
            type="button"
            onClick={saveSocial}
            disabled={savingSocial}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {savingSocial ? 'Saving…' : savedSocial ? '✓ Saved!' : 'Save'}
          </button>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yourshop"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-500 shrink-0" />
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="https://wa.me/97300000000"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-blue-600 shrink-0" />
            <input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/yourshop"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-gray-800 shrink-0" />
            <input
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="https://tiktok.com/@yourshop"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Page sections, tagline & banner require super admin approval before going live
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Submitting for Approval…' : saved ? '✓ Submitted!' : 'Submit for Approval'}
      </button>
    </div>
  )
}

function hasConfig(type: string) {
  return ['announcement-bar', 'top-sellers', 'new-arrivals', 'featured'].includes(type)
}

function SectionConfig({
  section, announcement, setAnnouncement, updateConfig,
}: {
  section: DisplaySection
  announcement: string
  setAnnouncement: (v: string) => void
  updateConfig: (type: string, key: string, value: unknown) => void
}) {
  switch (section.type) {
    case 'announcement-bar':
      return (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600">Announcement text</label>
          <input
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Free delivery on orders over 10 BHD!"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        </div>
      )
    case 'top-sellers':
    case 'new-arrivals':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Section title</label>
            <input
              value={String(section.config?.title ?? '')}
              onChange={(e) => updateConfig(section.type, 'title', e.target.value)}
              placeholder={section.type === 'top-sellers' ? 'Top Sellers' : 'New Arrivals'}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Products to show</label>
            <input
              type="number" min={2} max={12}
              value={Number(section.config?.count ?? 6)}
              onChange={(e) => updateConfig(section.type, 'count', parseInt(e.target.value) || 6)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
        </div>
      )
    case 'featured':
      return (
        <p className="text-xs text-gray-500">Mark products as "featured" from the Products page to appear here.</p>
      )
    default:
      return null
  }
}

function StatusBanner({ status, submittedAt, reviewNote }: { status?: string; submittedAt?: string; reviewNote?: string }) {
  if (status === 'approved') return null
  const isRejected = status === 'rejected'
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${isRejected ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
      {isRejected ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <Clock className="h-4 w-4 mt-0.5 shrink-0" />}
      <div>
        <p className="text-sm font-semibold">{isRejected ? 'Changes rejected — please revise and resubmit' : 'Pending super admin approval'}</p>
        {reviewNote && <p className="text-xs mt-1 opacity-80">Note: {reviewNote}</p>}
        {submittedAt && (
          <p className="text-xs mt-0.5 opacity-60">
            Submitted {new Date(submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
