'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Instagram, ShoppingBag } from 'lucide-react'

interface Post {
  url: string
  caption?: string
  productSlug?: string
}

declare global {
  interface Window { instgrm?: { Embeds: { process(): void } } }
}

export function InstagramFeed({ posts }: { posts: Post[] }) {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) {
      window.instgrm?.Embeds.process()
      return
    }
    loaded.current = true
    const s = document.createElement('script')
    s.src = 'https://www.instagram.com/embed.js'
    s.async = true
    s.onload = () => window.instgrm?.Embeds.process()
    document.body.appendChild(s)
  }, [posts])

  if (!posts.length) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
          <Instagram className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Instagram</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map((post, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* Instagram embed */}
            <div className="instagram-embed-wrap overflow-hidden max-h-[520px]">
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={post.url}
                data-instgrm-version="14"
                style={{ margin: 0, width: '100%', minWidth: 'unset' }}
              />
            </div>

            {/* Caption + CTA */}
            {(post.caption || post.productSlug) && (
              <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-gray-100">
                {post.caption && (
                  <p className="text-sm text-gray-600 line-clamp-1 flex-1">{post.caption}</p>
                )}
                {post.productSlug && (
                  <Link
                    href={`/products/${post.productSlug}`}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shrink-0"
                  >
                    <ShoppingBag className="h-3 w-3" /> Shop Now
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
