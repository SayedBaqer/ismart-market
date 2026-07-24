'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Eye, EyeOff, Megaphone, Clock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Ad {
  id: string
  title: string
  subtitle?: string
  imageUrl?: string
  ctaText: string
  ctaUrl: string
  type: string
  bgColor: string
  textColor: string
  isActive: boolean
  priority: number
  startsAt: string
  endsAt?: string
  views: number
  clicks: number
}

const EMPTY: Partial<Ad> = {
  title: '', subtitle: '', imageUrl: '', ctaText: 'Shop Now', ctaUrl: '/',
  type: 'BANNER', bgColor: '#1d4ed8', textColor: '#ffffff',
  isActive: true, priority: 0,
}

const TYPE_LABELS: Record<string, string> = {
  BANNER: 'Hero Banner', SHOP: 'Shop Promo', PRODUCT: 'Product/Sale', NEWS: 'Announcement',
}

export default function AdvertisementsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Partial<Ad>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () =>
    fetch('/api/admin/advertisements').then(r => r.json()).then(d => { setAds(d.ads); setLoading(false) })

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing({ ...EMPTY }); setShowForm(true) }
  const openEdit = (ad: Ad) => { setEditing(ad); setShowForm(true) }

  const save = async () => {
    setSaving(true)
    const method = editing.id ? 'PATCH' : 'POST'
    const url = editing.id ? `/api/admin/advertisements/${editing.id}` : '/api/admin/advertisements'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    setSaving(false)
    setShowForm(false)
    load()
  }

  const toggle = async (ad: Ad) => {
    await fetch(`/api/admin/advertisements/${ad.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !ad.isActive }),
    })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this advertisement?')) return
    await fetch(`/api/admin/advertisements/${id}`, { method: 'DELETE' })
    load()
  }

  const set = (field: keyof Ad, value: unknown) => setEditing(e => ({ ...e, [field]: value }))

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" /> Advertisements
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage rotating banners and promotions on the home page</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />New Ad</Button>
      </div>

      {/* Ad list */}
      {ads.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No advertisements yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first banner or promotion</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map(ad => (
            <div key={ad.id} className={`rounded-2xl border bg-white p-4 flex gap-4 items-center transition-opacity ${!ad.isActive ? 'opacity-50' : ''}`}>
              {/* Color preview */}
              <div className="h-14 w-20 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: ad.imageUrl ? `url(${ad.imageUrl}) center/cover` : ad.bgColor, color: ad.textColor }}>
                {!ad.imageUrl && ad.title.slice(0, 8)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{TYPE_LABELS[ad.type]}</span>
                  {ad.endsAt && new Date(ad.endsAt) < new Date() && (
                    <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" />Expired</span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 mt-1 truncate">{ad.title}</p>
                {ad.subtitle && <p className="text-xs text-gray-500 truncate">{ad.subtitle}</p>}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{ad.views} views · {ad.clicks} clicks</span>
                  <span>Priority: {ad.priority}</span>
                  {ad.endsAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Ends {new Date(ad.endsAt).toLocaleDateString()}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(ad)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  {ad.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => openEdit(ad)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => remove(ad.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editing.id ? 'Edit' : 'New'} Advertisement</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-xl font-light">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                  <select value={editing.type} onChange={e => set('type', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <Input label="Title *" value={editing.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Summer Sale — Up to 50% Off" />
                </div>
                <div className="col-span-2">
                  <Input label="Subtitle" value={editing.subtitle ?? ''} onChange={e => set('subtitle', e.target.value)} placeholder="Limited time only" />
                </div>
                <div className="col-span-2">
                  <Input label="Image URL" value={editing.imageUrl ?? ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
                </div>
                <Input label="Button Text" value={editing.ctaText ?? ''} onChange={e => set('ctaText', e.target.value)} />
                <Input label="Button Link" value={editing.ctaUrl ?? ''} onChange={e => set('ctaUrl', e.target.value)} placeholder="/products or /shops/slug" />
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editing.bgColor ?? '#1d4ed8'} onChange={e => set('bgColor', e.target.value)} className="h-9 w-12 rounded cursor-pointer border border-gray-200" />
                    <input type="text" value={editing.bgColor ?? ''} onChange={e => set('bgColor', e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editing.textColor ?? '#ffffff'} onChange={e => set('textColor', e.target.value)} className="h-9 w-12 rounded cursor-pointer border border-gray-200" />
                    <input type="text" value={editing.textColor ?? ''} onChange={e => set('textColor', e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <Input label="Priority (higher = first)" type="number" value={String(editing.priority ?? 0)} onChange={e => set('priority', parseInt(e.target.value) || 0)} />
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Starts At</label>
                  <input type="datetime-local" value={editing.startsAt ? editing.startsAt.slice(0, 16) : ''} onChange={e => set('startsAt', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Ends At (optional)</label>
                  <input type="datetime-local" value={editing.endsAt ? editing.endsAt.slice(0, 16) : ''} onChange={e => set('endsAt', e.target.value || undefined)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              {/* Preview */}
              {editing.title && (
                <div className="rounded-xl overflow-hidden h-28 flex items-center px-6 relative"
                  style={{ background: editing.imageUrl ? `url(${editing.imageUrl}) center/cover` : (editing.bgColor ?? '#1d4ed8') }}>
                  {editing.imageUrl && <div className="absolute inset-0 bg-black/40" />}
                  <div className="relative">
                    <p className="text-xl font-black leading-tight" style={{ color: editing.textColor ?? '#fff' }}>{editing.title}</p>
                    {editing.subtitle && <p className="text-sm mt-0.5 opacity-80" style={{ color: editing.textColor ?? '#fff' }}>{editing.subtitle}</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <Button onClick={save} isLoading={saving} className="flex-1">Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
