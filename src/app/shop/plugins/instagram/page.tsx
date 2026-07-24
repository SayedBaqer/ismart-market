'use client'

import { useEffect, useState } from 'react'
import { Instagram, Plus, Trash2, ExternalLink, Save, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Post {
  url: string
  caption: string
  productSlug: string
}

const EMPTY_POST: Post = { url: '', caption: '', productSlug: '' }

function isValidInstagramUrl(url: string) {
  return /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/.test(url)
}

export default function InstagramPluginPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/shop/plugins/instagram')
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const addPost = () => setPosts((p) => [...p, { ...EMPTY_POST }])
  const removePost = (i: number) => setPosts((p) => p.filter((_, idx) => idx !== i))
  const updatePost = (i: number, field: keyof Post, value: string) =>
    setPosts((p) => p.map((post, idx) => idx === i ? { ...post, [field]: value } : post))

  const save = async () => {
    setSaving(true)
    await fetch('/api/shop/plugins/instagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading...</div>

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
          <Instagram className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Instagram Catalog</h1>
          <p className="text-sm text-gray-500">Link your Instagram posts to your shop</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-semibold">How it works</p>
          <p>Paste the URL of any public Instagram post (photo, reel, or video). It will appear as an embedded card on your public shop page. Optionally link it to a product so customers can shop directly.</p>
        </div>
      </div>

      {/* Post list */}
      <div className="space-y-4">
        {posts.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
            <Instagram className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No Instagram posts added yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first post below</p>
          </div>
        )}

        {posts.map((post, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Post {i + 1}</span>
              <button onClick={() => removePost(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Instagram Post URL *</label>
                <div className="relative">
                  <input
                    type="url"
                    value={post.url}
                    onChange={(e) => updatePost(i, 'url', e.target.value)}
                    placeholder="https://www.instagram.com/p/ABC123/"
                    className={`w-full rounded-lg border px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                      post.url && !isValidInstagramUrl(post.url)
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-blue-400'
                    }`}
                  />
                  {post.url && isValidInstagramUrl(post.url) && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                {post.url && !isValidInstagramUrl(post.url) && (
                  <p className="text-xs text-red-500 mt-1">Must be a valid Instagram post, reel, or video URL</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={post.caption}
                  onChange={(e) => updatePost(i, 'caption', e.target.value)}
                  placeholder="Short description shown below the post"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Link to product (optional)</label>
                <input
                  type="text"
                  value={post.productSlug}
                  onChange={(e) => updatePost(i, 'productSlug', e.target.value)}
                  placeholder="product-slug (from product URL)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Adds a &ldquo;Shop Now&rdquo; button linking to that product page
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={addPost}
          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Post
        </button>

        <Button onClick={save} isLoading={saving} className="ml-auto gap-2">
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
