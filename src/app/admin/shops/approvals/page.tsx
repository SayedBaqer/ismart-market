'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardCheck, Store, Newspaper, CheckCircle2, XCircle,
  Clock, ChevronDown, ChevronUp, RefreshCw, Eye,
} from 'lucide-react'
import Image from 'next/image'

interface PendingDisplay {
  shopId: string
  shopName: string
  shopSlug: string
  shopLogoUrl: string | null
  submittedAt: string
  sections: { type: string; enabled: boolean }[]
  banner: string | null
  tagline: string
}

interface PendingNews {
  id: string
  title: string
  body: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
  shop: { id: string; name: string; slug: string; logoUrl: string | null }
  author: { name: string | null; email: string | null }
}

export default function ShopApprovalsPage() {
  const [tab, setTab] = useState<'display' | 'news'>('display')
  const [displays, setDisplays] = useState<PendingDisplay[]>([])
  const [news, setNews] = useState<PendingNews[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/shops/approvals')
      if (res.ok) {
        const data = await res.json()
        setDisplays(data.pendingDisplays ?? [])
        setNews(data.pendingNews ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function actDisplay(shopId: string, action: 'approve' | 'reject') {
    setActing(shopId)
    await fetch(`/api/admin/shops/${shopId}/display`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: notes[shopId] }),
    })
    await load()
    setActing(null)
  }

  async function actNews(shopId: string, newsId: string, action: 'approve' | 'reject') {
    setActing(newsId)
    await fetch(`/api/admin/shops/${shopId}/news/${newsId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: notes[newsId] }),
    })
    await load()
    setActing(null)
  }

  const totalPending = displays.length + news.length

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Shop Approvals</h1>
            <p className="text-sm text-gray-500">
              {totalPending > 0 ? `${totalPending} item${totalPending !== 1 ? 's' : ''} awaiting review` : 'No pending items'}
            </p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-6">
        {([
          { key: 'display', label: 'Page Designs', icon: Store, count: displays.length },
          { key: 'news', label: 'News Posts', icon: Newspaper, count: news.length },
        ] as const).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {count > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === key ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : tab === 'display' ? (
        displays.length === 0 ? (
          <EmptyState icon={Store} text="No pending page design changes" />
        ) : (
          <div className="space-y-4">
            {displays.map((d) => {
              const isExpanded = expandedId === d.shopId
              return (
                <div key={d.shopId} className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <ShopAvatar name={d.shopName} logoUrl={d.shopLogoUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{d.shopName}</p>
                      <p className="text-xs text-gray-400">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Submitted {new Date(d.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : d.shopId)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <a href={`/shops/${d.shopSlug}`} target="_blank" rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                      <Eye className="h-4 w-4" />
                    </a>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-4">
                      {/* Sections preview */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Requested sections:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(d.sections ?? []).map((s) => (
                            <span key={s.type} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                              {s.type}
                            </span>
                          ))}
                        </div>
                      </div>
                      {d.tagline && <p className="text-sm text-gray-600 italic">&ldquo;{d.tagline}&rdquo;</p>}
                      {d.banner && (
                        <div className="rounded-xl overflow-hidden border border-gray-200 h-24 relative">
                          <Image src={d.banner} alt="Banner" fill className="object-cover" />
                        </div>
                      )}
                      {/* Rejection note */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Rejection note (optional)</label>
                        <input
                          value={notes[d.shopId] ?? ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [d.shopId]: e.target.value }))}
                          placeholder="Explain why you're rejecting (shown to shop owner)"
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={acting === d.shopId}
                          onClick={() => actDisplay(d.shopId, 'approve')}
                          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve & Go Live
                        </button>
                        <button
                          type="button"
                          disabled={acting === d.shopId}
                          onClick={() => actDisplay(d.shopId, 'reject')}
                          className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : (
        news.length === 0 ? (
          <EmptyState icon={Newspaper} text="No pending news posts" />
        ) : (
          <div className="space-y-4">
            {news.map((post) => {
              const isExpanded = expandedId === post.id
              return (
                <div key={post.id} className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <ShopAvatar name={post.shop.name} logoUrl={post.shop.logoUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{post.title}</p>
                      <p className="text-xs text-gray-400">
                        {post.shop.name} · by {post.author.name ?? post.author.email} ·{' '}
                        {new Date(post.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : post.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.body}</p>
                      {post.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-gray-200 h-48 relative">
                          <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
                        </div>
                      )}
                      {/* Rejection note */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Rejection note (optional)</label>
                        <input
                          value={notes[post.id] ?? ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [post.id]: e.target.value }))}
                          placeholder="Explain what needs to be changed"
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={acting === post.id}
                          onClick={() => actNews(post.shop.id, post.id, 'approve')}
                          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve & Publish
                        </button>
                        <button
                          type="button"
                          disabled={acting === post.id}
                          onClick={() => actNews(post.shop.id, post.id, 'reject')}
                          className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject with Note
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

function ShopAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 relative">
        <Image src={logoUrl} alt={name} fill className="object-cover" />
      </div>
    )
  }
  return (
    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-sm">
      {name[0]?.toUpperCase()}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
      <Icon className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-sm font-semibold text-gray-500">{text}</p>
      <p className="text-xs text-gray-400 mt-1">All caught up! Check back later.</p>
    </div>
  )
}
