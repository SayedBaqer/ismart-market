import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import { Calendar, Newspaper } from 'lucide-react'

export async function NewsSection() {
  const posts = await prisma.newsPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true, createdAt: true, imageUrl: true },
  })

  if (posts.length === 0) return null

  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">News & Updates</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Latest News</h2>
          </div>
          <Link href="/news" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const date = post.publishedAt ?? post.createdAt
            return (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                {post.imageUrl ? (
                  <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                    <Image src={post.imageUrl} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <Newspaper className="h-10 w-10 text-blue-200" />
                  </div>
                )}
                <div className="flex flex-col gap-2 p-5">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs text-gray-500 line-clamp-2">{post.excerpt}</p>
                  )}
                  <span className="mt-auto text-xs font-semibold text-blue-600">Read more →</span>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link href="/news" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all news →</Link>
        </div>
      </div>
    </section>
  )
}
