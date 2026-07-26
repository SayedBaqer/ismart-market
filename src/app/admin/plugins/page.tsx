'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Plug } from 'lucide-react'

interface Plugin {
  slug: string
  name: string
  version: string
  active: boolean
  description: string | null
  category: string
  minPlan: string
  updatedAt: string
}

const PLANS = ['FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE']

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/plugins')
    if (res.ok) setPlugins(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(slug: string, active: boolean) {
    await fetch(`/api/admin/plugins/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    load()
  }

  async function setMinPlan(slug: string, minPlan: string) {
    await fetch(`/api/admin/plugins/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minPlan }),
    })
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Plugins</h1>
        <p className="text-sm text-gray-500">Control which features shops can enable, and the minimum plan required</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : plugins.length === 0 ? (
            <div className="py-12 text-center">
              <Plug className="mx-auto mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No plugins registered</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-3 text-left font-medium">Plugin</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-center font-medium">Min Plan</th>
                    <th className="px-4 py-3 text-center font-medium">Platform Status</th>
                    <th className="px-4 py-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plugins.map((p) => (
                    <tr key={p.slug} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 max-w-xs">{p.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 capitalize">{p.category}</td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={p.minPlan}
                          onChange={(e) => setMinPlan(p.slug, e.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          {PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggle(p.slug, !p.active)}
                          className={`rounded-lg px-3 py-1 text-xs font-medium ${
                            p.active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
