'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Puzzle, Lock, ExternalLink } from 'lucide-react'
import { PLUGIN_ICONS } from '@/components/shop/plugin-icons'
import { PLUGIN_ROUTES } from '@/lib/plugin-routes'

interface PluginRow {
  slug: string
  name: string
  description: string | null
  category: string
  icon: string | null
  minPlan: string
  locked: boolean
  enabled: boolean
}

export default function ShopPluginsPage() {
  const [plugins, setPlugins] = useState<PluginRow[]>([])
  const [plan, setPlan] = useState('FREE')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/shop/plugins')
    if (res.ok) {
      const d = await res.json()
      setPlugins(d.plugins ?? [])
      setPlan(d.plan ?? 'FREE')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(slug: string, enabled: boolean) {
    setBusy(slug)
    setError('')
    const res = await fetch(`/api/shop/plugins/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to update plugin')
    }
    await load()
    setBusy(null)
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 md:pb-6">
      <div className="flex items-center gap-3">
        <Puzzle className="h-5 w-5 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Plugins</h1>
          <p className="text-xs text-gray-500">Extend your shop with optional features · your plan: <span className="font-semibold">{plan}</span></p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plugins.map((p) => {
            const Icon = (p.icon && PLUGIN_ICONS[p.icon]) || Puzzle
            const href = PLUGIN_ROUTES[p.slug]
            return (
              <div key={p.slug} className={`rounded-2xl border bg-white p-5 shadow-sm space-y-3 ${p.locked ? 'border-gray-100 opacity-75' : 'border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.locked ? 'bg-gray-100' : 'bg-blue-50'}`}>
                    <Icon className={`h-5 w-5 ${p.locked ? 'text-gray-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{p.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        p.minPlan === 'FREE' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
                      }`}>
                        {p.minPlan === 'FREE' ? 'Free' : `${p.minPlan}+`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                  </div>
                </div>

                {p.locked ? (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    Requires {p.minPlan} plan or higher
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggle(p.slug, !p.enabled)}
                      disabled={busy === p.slug}
                      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${p.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${p.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                    {p.enabled && href && (
                      <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                        Open <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
