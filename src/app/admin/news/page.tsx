'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, X, Pencil, Newspaper } from 'lucide-react'

interface NewsPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
}

const EMPTY = { title: '', excerpt: '', content: '', imageUrl: '', isPublished: false }

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/news')
    if (res.ok) setPosts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY)
    setError('')
    setShowForm(true)
  }

  async function save() {
    if (!form.title) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    const url = editId ? `/api/admin/news/${editId}` : '/api/admin/news'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed')
      setSaving(false)
      return
    }
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function toggle(post: NewsPost) {
    await fetch(`/api/admin/news/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !post.isPublished }),
    })
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">News & Blog</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Post
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{editId ? 'Edit Post' : 'New Post'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            {error && <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">{error}</div>}
            <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Content</label>
              <textarea
                rows={6}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                placeholder="Write your post…"
              />
            </div>
            <Input label="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="rounded"
              />
              Publish immediately
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" isLoading={saving} onClick={save}>Save Post</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center">
              <Newspaper className="mx-auto mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No news posts yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Published</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.title}</p>
                      {p.excerpt && <p className="text-xs text-gray-400 line-clamp-1">{p.excerpt}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={p.isPublished ? 'success' : 'default'}>
                        {p.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => toggle(p)}
                          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100"
                        >
                          {p.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => {
                            setEditId(p.id)
                            setForm({ title: p.title, excerpt: p.excerpt ?? '', content: '', imageUrl: '', isPublished: p.isPublished })
                            setShowForm(true)
                          }}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
