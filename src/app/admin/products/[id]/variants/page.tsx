'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Variant {
  id: string
  sku: string
  attributes: Record<string, string>
  price: number
  stockQty: number
  isActive: boolean
}

const EMPTY_VARIANT = { sku: '', attributes: '{"color":"","size":""}', price: '', stockQty: '0' }

export default function ProductVariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [productName, setProductName] = useState('')
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_VARIANT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ price: string; stockQty: string; isActive: boolean }>({
    price: '',
    stockQty: '',
    isActive: true,
  })

  async function load() {
    const [nameRes, varRes] = await Promise.all([
      fetch(`/api/products/${id}`),
      fetch(`/api/admin/products/${id}/variants`),
    ])
    if (nameRes.ok) {
      const p = await nameRes.json()
      setProductName(p.name ?? '')
    }
    if (varRes.ok) {
      setVariants(await varRes.json())
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function createVariant() {
    setError('')
    let attrs: Record<string, string>
    try {
      attrs = JSON.parse(form.attributes)
    } catch {
      setError('Attributes must be valid JSON (e.g. {"color":"Red","size":"L"})')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/admin/products/${id}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: form.sku,
        attributes: attrs,
        price: parseFloat(form.price) || 0,
        stockQty: parseInt(form.stockQty) || 0,
      }),
    })
    if (res.ok) {
      setForm(EMPTY_VARIANT)
      setShowForm(false)
      load()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to create variant')
    }
    setSaving(false)
  }

  async function saveEdit(variantId: string) {
    const res = await fetch(`/api/admin/products/${id}/variants/${variantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: parseFloat(editForm.price) || 0,
        stockQty: parseInt(editForm.stockQty) || 0,
        isActive: editForm.isActive,
      }),
    })
    if (res.ok) {
      setEditId(null)
      load()
    }
  }

  async function deleteVariant(variantId: string) {
    if (!confirm('Delete this variant?')) return
    await fetch(`/api/admin/products/${id}/variants/${variantId}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/products/${id}/edit`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Product Variants</h1>
            {productName && <p className="text-xs text-gray-400">{productName}</p>}
          </div>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setError('') }}>
          <Plus className="h-4 w-4 mr-1" /> Add Variant
        </Button>
      </div>

      {/* Add Variant Form */}
      {showForm && (
        <Card>
          <CardContent className="py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">New Variant</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">SKU *</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="PROD-RED-L"
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Price (BHD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0.000"
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Stock Qty</label>
                <input
                  type="number"
                  min="0"
                  value={form.stockQty}
                  onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Attributes (JSON)
                  <span className="ml-2 font-normal text-gray-400">e.g. {`{"color":"Red","size":"L"}`}</span>
                </label>
                <input
                  value={form.attributes}
                  onChange={(e) => setForm((f) => ({ ...f, attributes: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" isLoading={saving} onClick={createVariant}>
                <Check className="h-3.5 w-3.5 mr-1" /> Create Variant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variants Table */}
      <Card>
        <CardContent className="p-0">
          {variants.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No variants yet.</p>
              <p className="mt-1 text-xs text-gray-300">Add variants for different colors, sizes, etc.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-left font-medium">Attributes</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-center font-medium">Stock</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {variants.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{v.sku}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(v.attributes).map(([k, val]) => (
                          <span key={k} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {k}: {val}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editId === v.id ? (
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={editForm.price}
                          onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                          className="h-8 w-24 rounded border border-gray-200 px-2 text-right text-sm"
                        />
                      ) : (
                        <span className="font-medium">{Number(v.price).toFixed(3)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editId === v.id ? (
                        <input
                          type="number"
                          min="0"
                          value={editForm.stockQty}
                          onChange={(e) => setEditForm((f) => ({ ...f, stockQty: e.target.value }))}
                          className="h-8 w-20 rounded border border-gray-200 px-2 text-center text-sm"
                        />
                      ) : (
                        <Badge variant={v.stockQty === 0 ? 'danger' : 'success'}>{v.stockQty}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editId === v.id ? (
                        <select
                          value={editForm.isActive ? 'true' : 'false'}
                          onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}
                          className="h-8 rounded border border-gray-200 px-2 text-sm"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <Badge variant={v.isActive ? 'success' : 'default'}>{v.isActive ? 'Active' : 'Inactive'}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editId === v.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(v.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditId(v.id)
                                setEditForm({
                                  price: String(Number(v.price)),
                                  stockQty: String(v.stockQty),
                                  isActive: v.isActive,
                                })
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteVariant(v.id)}
                              className="text-gray-300 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
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
