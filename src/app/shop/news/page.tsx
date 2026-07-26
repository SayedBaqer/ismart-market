'use client'

import { useEffect, useState, useCallback } from 'react'
import { Newspaper, Plus, Edit2, Trash2, Send, Clock, CheckCircle2, XCircle, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useShopT } from '@/components/shop/lang-provider'
import type { ShopTranslations } from '@/lib/i18n/shop'

interface NewsPost {
  id: string
  title: string
  body: string
  imageUrl: string | null
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED'
  reviewNote: string | null
  publishedAt: string | null
  createdAt: string
  author: { name: string | null; email: string | null }
  reviewer: { name: string | null } | null
}

function statusMeta(t: ShopTranslations) {
  return {
    DRAFT:     { label: t.newsStatusDraft,    cls: 'bg-gray-100 text-gray-600',     Icon: FileText },
    PENDING:   { label: t.newsStatusPending,  cls: 'bg-amber-100 text-amber-700',   Icon: Clock },
    PUBLISHED: { label: t.newsStatusPublished, cls: 'bg-green-100 text-green-700',  Icon: CheckCircle2 },
    REJECTED:  { label: t.newsStatusRejected, cls: 'bg-red-100 text-red-700',       Icon: XCircle },
  }
}

export default function ShopNewsPage() {
  const t = useShopT()
  const STATUS_META = statusMeta(t)
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NewsPost | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shop/news')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.news ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setTitle('')
    setBody('')
    setImageUrl('')
    setShowForm(true)
  }

  function openEdit(post: NewsPost) {
    setEditing(post)
    setTitle(post.title)
    setBody(post.body)
    setImageUrl(post.imageUrl ?? '')
    setShowForm(true)
  }

  async function submit(asDraft: boolean) {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    try {
      const method = editing ? 'PATCH' : 'POST'
      const url = editing ? `/api/shop/news/${editing.id}` : '/api/shop/news'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, imageUrl, submit: !asDraft }),
      })
      if (res.ok) {
        await load()
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (!confirm(t.newsDeleteConfirm)) return
    await fetch(`/api/shop/news/${id}`, { method: 'DELETE' })
    setPosts((p) => p.filter((x) => x.id !== id))
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 md:pb-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t.newsTitle}</h1>
            <p className="text-xs text-gray-500">{t.newsSubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t.newsNewPost}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-blue-900">{editing ? t.newsEditPost : t.newsNewPost}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600">{t.newsPostTitle}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.newsPostTitlePlaceholder}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">{t.newsContent}</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder={t.newsContentPlaceholder}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">{t.newsImageUrl}</label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          {(!title.trim() || !body.trim()) && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{t.newsTitleContentRequired}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => submit(true)} disabled={submitting || !title.trim() || !body.trim()}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <FileText className="h-3.5 w-3.5" />
              {t.newsSaveDraft}
            </button>
            <button type="button" onClick={() => submit(false)} disabled={submitting || !title.trim() || !body.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
              {submitting ? t.newsSubmitting : t.newsSubmitForReview}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="ml-auto text-sm text-gray-400 hover:text-gray-600 px-2">
              {t.newsCancel}
            </button>
          </div>
        </div>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Newspaper className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500">{t.newsNoPosts}</p>
          <p className="text-xs text-gray-400 mt-1">{t.newsCreateFirst}</p>
          <button type="button" onClick={openNew} className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> {t.newsNewPost}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const sm = STATUS_META[post.status]
            const Icon = sm.Icon
            const isExpanded = expandedId === post.id
            const canEdit = post.status === 'DRAFT' || post.status === 'REJECTED'
            return (
              <div key={post.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sm.cls}`}>
                        <Icon className="h-3 w-3" />
                        {sm.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{post.title}</p>
                    {post.status === 'REJECTED' && post.reviewNote && (
                      <p className="mt-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
                        {t.newsRejectionNote} {post.reviewNote}
                      </p>
                    )}
                    {isExpanded && (
                      <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{post.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : post.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {canEdit && (
                      <button type="button" onClick={() => openEdit(post)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {post.status !== 'PUBLISHED' && (
                      <button type="button" onClick={() => remove(post.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
