'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ChevronUp, ChevronDown, Eye, EyeOff, Save, Clock,
  CheckCircle2, XCircle, AlertCircle, Settings, Store,
  Instagram, MessageCircle, Facebook, Music2, Percent,
} from 'lucide-react'
import { useShopT } from '@/components/shop/lang-provider'
import type { ShopTranslations } from '@/lib/i18n/shop'

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

function sectionMeta(t: ShopTranslations): Record<string, { label: string; desc: string; icon: string }> {
  return {
    'announcement-bar': { label: t.setSecAnnouncementBar, desc: t.setSecAnnouncementBarDesc, icon: '📢' },
    'top-sellers':      { label: t.setSecTopSellers, desc: t.setSecTopSellersDesc, icon: '🏆' },
    'new-arrivals':     { label: t.setSecNewArrivals, desc: t.setSecNewArrivalsDesc, icon: '✨' },
    'recent-sales':     { label: t.setSecRecentSales, desc: t.setSecRecentSalesDesc, icon: '⚡' },
    'featured':         { label: t.setSecFeatured, desc: t.setSecFeaturedDesc, icon: '⭐' },
    'categories':       { label: t.setSecCategories, desc: t.setSecCategoriesDesc, icon: '🗂️' },
    'about':            { label: t.setSecAbout, desc: t.setSecAboutDesc, icon: '🏪' },
  }
}

const ALL_SECTION_TYPES = [
  'announcement-bar', 'top-sellers', 'new-arrivals', 'recent-sales', 'featured', 'categories', 'about',
]

export default function ShopSettingsPage() {
  const t = useShopT()
  const SECTION_META = sectionMeta(t)
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

  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxRate, setTaxRate] = useState('10')
  const [taxInclusive, setTaxInclusive] = useState(false)
  const [taxLabel, setTaxLabel] = useState('VAT')
  const [taxNumber, setTaxNumber] = useState('')
  const [savingTax, setSavingTax] = useState(false)
  const [savedTax, setSavedTax] = useState(false)

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
      const taxRes = await fetch('/api/shop/tax')
      if (taxRes.ok) {
        const taxData = await taxRes.json()
        const t = taxData.tax ?? {}
        setTaxEnabled(Boolean(t.enabled))
        setTaxRate(String(t.rate ?? 10))
        setTaxInclusive(Boolean(t.inclusive))
        setTaxLabel(t.label ?? 'VAT')
        setTaxNumber(t.number ?? '')
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

  async function saveTax() {
    setSavingTax(true)
    const res = await fetch('/api/shop/tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: taxEnabled, rate: parseFloat(taxRate) || 0, inclusive: taxInclusive, label: taxLabel, number: taxNumber }),
    })
    if (res.ok) {
      setSavedTax(true)
      setTimeout(() => setSavedTax(false), 2500)
    }
    setSavingTax(false)
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
            <h1 className="text-xl font-bold text-gray-900">{t.setPageBuilder}</h1>
            <p className="text-xs text-gray-500">{t.setChangesRequireApproval.replace('{shopName}', shopName)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? t.setSubmitting : saved ? t.setSubmitted : t.setSubmitForApproval}
        </button>
      </div>

      {/* Status banners */}
      {pending && (
        <StatusBanner
          status={pending.status}
          submittedAt={pending.submittedAt}
          reviewNote={pending.reviewNote}
          t={t}
        />
      )}
      {display?.status === 'approved' && !pending && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{t.setLiveApproved.replace('{date}', new Date(display.approvedAt ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}</span>
        </div>
      )}

      {/* Section builder */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Store className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">{t.setShopPageSections}</h2>
          <span className="ml-auto text-xs text-gray-400">{t.setReorderToggleConfig}</span>
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
                      {isExpanded ? t.setClose : t.setConfig}
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
                      t={t}
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
        <h2 className="text-sm font-semibold text-gray-900">{t.setShopTagline}</h2>
        <input
          value={tagline}
          onChange={(e) => { setTagline(e.target.value); setSaved(false) }}
          placeholder={t.setTaglinePlaceholder}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Banner */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">{t.setShopBannerUrl}</h2>
        <input
          value={banner}
          onChange={(e) => { setBanner(e.target.value); setSaved(false) }}
          placeholder={t.setBannerPlaceholder}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="banner preview" className="w-full h-28 object-cover rounded-xl border border-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
      </div>

      {/* Tax settings */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-gray-500" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{t.setTaxSettings}</h2>
              <p className="text-xs text-gray-400">{t.setTaxSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={saveTax}
            disabled={savingTax}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {savingTax ? t.setSaving : savedTax ? t.setSavedShort : t.setSaveTax}
          </button>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setTaxEnabled(!taxEnabled)}
            className={`relative h-6 w-11 rounded-full transition-colors ${taxEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${taxEnabled ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {taxEnabled ? t.setTaxEnabled : t.setTaxDisabled}
          </span>
        </label>

        {taxEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600">{t.setTaxLabel}</label>
              <input value={taxLabel} onChange={e => setTaxLabel(e.target.value)}
                placeholder="VAT"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">{t.setRatePercent}</label>
              <input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)}
                placeholder="10"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600">{t.setTaxRegNumber}</label>
              <input value={taxNumber} onChange={e => setTaxNumber(e.target.value)}
                placeholder="e.g. BH123456789"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={taxInclusive} onChange={e => setTaxInclusive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600" />
                {t.setPricesTaxInclusive}
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-6">
                {taxInclusive ? t.setTaxInclusiveHint : t.setTaxExclusiveHint}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Social links */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t.setSocialLinks}</h2>
            <p className="text-xs text-gray-400">{t.setSocialSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={saveSocial}
            disabled={savingSocial}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {savingSocial ? t.setSaving : savedSocial ? t.setSavedShort : t.setSave}
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
        {t.setApprovalFooter}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow"
      >
        <Save className="h-4 w-4" />
        {saving ? t.setSubmittingLong : saved ? t.setSubmitted : t.setSubmitForApproval}
      </button>
    </div>
  )
}

function hasConfig(type: string) {
  return ['announcement-bar', 'top-sellers', 'new-arrivals', 'featured'].includes(type)
}

function SectionConfig({
  section, announcement, setAnnouncement, updateConfig, t,
}: {
  section: DisplaySection
  announcement: string
  setAnnouncement: (v: string) => void
  updateConfig: (type: string, key: string, value: unknown) => void
  t: ShopTranslations
}) {
  switch (section.type) {
    case 'announcement-bar':
      return (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600">{t.setAnnouncementText}</label>
          <input
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder={t.setAnnouncementPlaceholder}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        </div>
      )
    case 'top-sellers':
    case 'new-arrivals':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">{t.setSectionTitle}</label>
            <input
              value={String(section.config?.title ?? '')}
              onChange={(e) => updateConfig(section.type, 'title', e.target.value)}
              placeholder={section.type === 'top-sellers' ? t.setSecTopSellers : t.setSecNewArrivals}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">{t.setProductsToShow}</label>
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
        <p className="text-xs text-gray-500">{t.setFeaturedHint}</p>
      )
    default:
      return null
  }
}

function StatusBanner({ status, submittedAt, reviewNote, t }: { status?: string; submittedAt?: string; reviewNote?: string; t: ShopTranslations }) {
  if (status === 'approved') return null
  const isRejected = status === 'rejected'
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${isRejected ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
      {isRejected ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <Clock className="h-4 w-4 mt-0.5 shrink-0" />}
      <div>
        <p className="text-sm font-semibold">{isRejected ? t.setChangesRejected : t.setPendingApproval}</p>
        {reviewNote && <p className="text-xs mt-1 opacity-80">{t.setNote} {reviewNote}</p>}
        {submittedAt && (
          <p className="text-xs mt-0.5 opacity-60">
            {t.setSubmittedOn.replace('{date}', new Date(submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}
          </p>
        )}
      </div>
    </div>
  )
}
