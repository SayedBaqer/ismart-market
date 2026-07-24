'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Ad {
  id: string
  title: string
  subtitle?: string | null
  imageUrl?: string | null
  ctaText: string
  ctaUrl: string
  bgColor: string
  textColor: string
}

interface Props { ads: Ad[] }

export function AdCarousel({ ads }: Props) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setIdx(i => (i + 1) % ads.length), [ads.length])
  const prev = () => setIdx(i => (i - 1 + ads.length) % ads.length)

  useEffect(() => {
    if (paused || ads.length <= 1) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [paused, next, ads.length])

  if (!ads.length) return null

  const ad = ads[idx]

  const trackClick = () => fetch(`/api/advertisements/${ad.id}/click`, { method: 'POST' }).catch(() => {})

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide */}
      <div
        className="relative w-full h-48 sm:h-64 md:h-80 flex items-center transition-all"
        style={{ background: ad.imageUrl ? undefined : ad.bgColor }}
      >
        {ad.imageUrl && (
          <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" priority={idx === 0} />
        )}
        {ad.imageUrl && <div className="absolute inset-0 bg-black/40" />}

        <div className="relative z-10 px-8 sm:px-16 max-w-2xl">
          <p className="text-2xl sm:text-4xl font-black leading-tight" style={{ color: ad.textColor }}>{ad.title}</p>
          {ad.subtitle && (
            <p className="mt-2 text-sm sm:text-base opacity-90" style={{ color: ad.textColor }}>{ad.subtitle}</p>
          )}
          <Link
            href={ad.ctaUrl}
            onClick={trackClick}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow-lg hover:bg-gray-50 transition-colors"
            style={{ color: ad.bgColor }}
          >
            {ad.ctaText}
          </Link>
        </div>
      </div>

      {/* Arrows */}
      {ads.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {ads.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
