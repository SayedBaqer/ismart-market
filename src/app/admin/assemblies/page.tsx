'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, Plus, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

interface Product { id: string; name: string; sku: string; price: number }

interface Component {
  id: string
  qty: number
  product: Product
}

interface Assembly {
  id: string
  productId: string
  extraCharge: number
  totalCostBhd: number
  notes: string | null
  product: Product
  components: Component[]
}

export default function AssembliesPage() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // New assembly form state
  const [productId, setProductId] = useState('')
  const [extraCharge, setExtraCharge] = useState('0')
  const [notes, setNotes] = useState('')
  const [components, setComponents] = useState<Array<{ productId: string; qty: string }>>([
    { productId: '', qty: '1' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [aRes, pRes] = await Promise.all([
      fetch('/api/admin/assemblies'),
      fetch('/api/products?pageSize=200'),
    ])
    if (aRes.ok) setAssemblies(await aRes.json())
    if (pRes.ok) setProducts((await pRes.json()).items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    const validComps = components.filter((c) => c.productId && parseFloat(c.qty) > 0)
    if (!productId) { setError('Select the bundle product'); return }
    if (validComps.length === 0) { setError('Add at least one component'); return }
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/assemblies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        extraCharge: parseFloat(extraCharge) || 0,
        notes: notes || undefined,
        components: validComps.map((c) => ({
          productId: c.productId,
          qty: parseFloat(c.qty),
        })),
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed')
      setSaving(false)
      return
    }

    setShowForm(false)
    setSaving(false)
    setProductId('')
    setExtraCharge('0')
    setNotes('')
    setComponents([{ productId: '', qty: '1' }])
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this assembly?')) return
    await fetch(`/api/admin/assemblies/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Assemblies / Bundles</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Assembly
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">New Assembly</h2>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">{error}</div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Bundle Product *</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="">— Select product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Extra Charge (BHD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={extraCharge}
                  onChange={(e) => setExtraCharge(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-gray-700">Components</label>
              <div className="space-y-2">
                {components.map((comp, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={comp.productId}
                      onChange={(e) => {
                        const updated = [...components]
                        updated[idx] = { ...comp, productId: e.target.value }
                        setComponents(updated)
                      }}
                      className="h-9 flex-1 rounded-md border border-gray-200 bg-white px-3 text-sm"
                    >
                      <option value="">— Select component —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={comp.qty}
                      onChange={(e) => {
                        const updated = [...components]
                        updated[idx] = { ...comp, qty: e.target.value }
                        setComponents(updated)
                      }}
                      className="h-9 w-20 rounded-md border border-gray-200 px-3 text-sm text-center"
                      placeholder="Qty"
                    />
                    <button
                      onClick={() => setComponents(components.filter((_, i) => i !== idx))}
                      disabled={components.length === 1}
                      className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setComponents([...components, { productId: '', qty: '1' }])}
                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Component
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm"
                placeholder="Assembly notes…"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" isLoading={saving} onClick={save}>Save Assembly</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : assemblies.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="mx-auto mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No assemblies yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {assemblies.map((asm) => (
                <div key={asm.id}>
                  <div
                    className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === asm.id ? null : asm.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expanded === asm.id ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{asm.product.name}</p>
                        <p className="text-xs text-gray-400">SKU: {asm.product.sku} · {asm.components.length} component{asm.components.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        Cost: {Number(asm.totalCostBhd).toFixed(3)} BHD
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(asm.id) }}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {expanded === asm.id && (
                    <div className="border-t border-gray-50 bg-gray-50 px-4 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="pb-1 text-left">Component</th>
                            <th className="pb-1 text-center">SKU</th>
                            <th className="pb-1 text-center">Qty</th>
                            <th className="pb-1 text-right">Unit Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {asm.components.map((c) => (
                            <tr key={c.id}>
                              <td className="py-0.5 text-gray-800">{c.product.name}</td>
                              <td className="py-0.5 text-center font-mono text-gray-500">{c.product.sku}</td>
                              <td className="py-0.5 text-center text-gray-700">× {c.qty}</td>
                              <td className="py-0.5 text-right text-gray-600">{Number(c.product.price).toFixed(3)} BHD</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {asm.notes && (
                        <p className="mt-2 text-xs text-gray-500">{asm.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
