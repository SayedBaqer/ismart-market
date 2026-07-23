import Link from 'next/link'
import { getSetting } from '@/lib/services/settings.service'
import { prisma } from '@/lib/db'
import { ShoppingBag, Truck, Shield, Star } from 'lucide-react'

export async function HeroSection() {
  const [companyName, tagline, productCount] = await Promise.all([
    getSetting('company.name'),
    getSetting('company.tagline'),
    prisma.product.count({ where: { isActive: true, isHidden: false } }).catch(() => 0),
  ])

  const name = companyName ?? 'iSmart Market'
  const sub = tagline ?? 'Professional equipment and accessories delivered to your door.'

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center">

          {/* Left — copy */}
          <div className="flex-1 max-w-2xl">
            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur">
              <Star className="h-3 w-3 fill-current" />
              {productCount > 0 ? `${productCount}+ Products Available` : 'Shop Now'}
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {name.split(' ').map((word, i) => (
                <span key={i}>
                  {i > 0 && ' '}
                  {i === name.split(' ').length - 1 ? (
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                      {word}
                    </span>
                  ) : word}
                </span>
              ))}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-slate-300 sm:text-xl">
              {sub}
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-500 hover:shadow-blue-700/50 hover:-translate-y-0.5"
              >
                <ShoppingBag className="h-4 w-4 transition-transform group-hover:scale-110" />
                Shop Now
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10 hover:-translate-y-0.5"
              >
                View Catalogue
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-6">
              {[
                { icon: Truck, label: 'Fast Delivery' },
                { icon: Shield, label: 'Secure Payments' },
                { icon: Star, label: 'Quality Products' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-slate-400">
                  <Icon className="h-4 w-4 text-blue-400" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating cards */}
          <div className="hidden lg:block lg:w-80 xl:w-96">
            <div className="relative">
              {/* Main card */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latest Products</span>
                  <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">Live</span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-600/20 border border-blue-500/20" />
                      <div className="flex-1">
                        <div className={`h-2.5 rounded-full bg-white/20 ${i === 1 ? 'w-3/4' : i === 2 ? 'w-1/2' : 'w-2/3'}`} />
                        <div className="mt-1.5 h-2 w-1/3 rounded-full bg-blue-400/30" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-px bg-white/10" />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{productCount} products</span>
                  <span className="text-blue-400 font-medium">View all →</span>
                </div>
              </div>

              {/* Floating stat */}
              <div className="absolute -right-4 -top-4 rounded-xl border border-white/10 bg-blue-600/80 px-4 py-2.5 backdrop-blur shadow-xl">
                <p className="text-xs text-blue-200">In Stock</p>
                <p className="text-xl font-bold text-white">{productCount}</p>
              </div>

              {/* Bottom accent */}
              <div className="absolute -bottom-4 -left-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {['bg-blue-400', 'bg-indigo-400', 'bg-cyan-400'].map((c) => (
                      <div key={c} className={`h-6 w-6 rounded-full border-2 border-slate-900 ${c}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-300">Trusted by customers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" className="w-full fill-gray-50" preserveAspectRatio="none">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,60 L0,60 Z" />
        </svg>
      </div>
    </section>
  )
}
