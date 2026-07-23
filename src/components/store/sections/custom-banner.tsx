import Link from 'next/link'
import Image from 'next/image'
import type { HomeSection } from '@/lib/services/settings.service'

interface Props { config: HomeSection['config'] }

export function CustomBanner({ config }: Props) {
  const title = config?.title ?? 'Special Offer'
  const subtitle = config?.subtitle ?? 'Discover our exclusive deals'
  const ctaText = config?.ctaText ?? 'Shop Now'
  const ctaUrl = config?.ctaUrl ?? '/products'
  const imageUrl = config?.imageUrl
  const bgFrom = config?.bgFrom ?? '#0f172a'
  const bgTo = config?.bgTo ?? '#1e3a5f'

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      {imageUrl ? (
        <div className="absolute inset-0">
          <Image src={imageUrl} alt={title} fill className="object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})` }}
        />
      )}

      {/* Decorative circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute right-1/4 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-white/5" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-lg text-white/80 leading-relaxed">{subtitle}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={ctaUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-gray-900 shadow-lg transition-all hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {ctaText}
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20 hover:-translate-y-0.5"
            >
              Browse catalogue
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
