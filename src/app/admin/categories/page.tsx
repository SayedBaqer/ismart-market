'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pencil, Trash2, X, Check, Tag, Languages, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
  parentId: string | null
  meta?: { translations?: { ar?: { name?: string; description?: string } } }
  _count: { products: number }
}

interface FormState {
  name: string
  slug: string
  description: string
  parentId: string
  isActive: boolean
  nameAr: string
  descriptionAr: string
}

const EMPTY: FormState = { name: '', slug: '', description: '', parentId: '', isActive: true, nameAr: '', descriptionAr: '' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoTranslating, setAutoTranslating] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/categories')
    const data = await res.json()
    setCategories(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function startCreate() {
    setEditId(null)
    setForm(EMPTY)
    setError('')
    setShowForm(true)
  }

  function startEdit(cat: Category) {
    setEditId(cat.id)
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      parentId: cat.parentId ?? '',
      isActive: cat.isActive,
      nameAr: cat.meta?.translations?.ar?.name ?? '',
      descriptionAr: cat.meta?.translations?.ar?.description ?? '',
    })
    setError('')
    setShowForm(true)
  }

  async function autoTranslate() {
    if (!form.name.trim()) { setError('Enter an English name first'); return }
    setAutoTranslating(true)
    setError('')
    try {
      const res = await fetch('/api/shop/products/auto-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: form.name.trim(), description: form.description.trim() || undefined, targetLang: 'ar' }),
      })
      const d = await res.json() as { name: string | null; description: string | null; note?: string }
      if (d.note) { setError(d.note); return }
      // Auto-translate only fills empty fields — manual typing always overrides it
      setForm((f) => ({
        ...f,
        nameAr: f.nameAr.trim() || d.name || f.nameAr,
        descriptionAr: f.descriptionAr.trim() || d.description || f.descriptionAr,
      }))
    } finally {
      setAutoTranslating(false)
    }
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')

    const url = editId ? `/api/categories/${editId}` : '/api/categories'
    const method = editId ? 'PUT' : 'POST'

    const existing = editId ? categories.find((c) => c.id === editId) : undefined
    const meta = {
      ...(existing?.meta ?? {}),
      translations: {
        ...(existing?.meta?.translations ?? {}),
        ar: {
          ...(form.nameAr.trim() && { name: form.nameAr.trim() }),
          ...(form.descriptionAr.trim() && { description: form.descriptionAr.trim() }),
        },
      },
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        parentId: form.parentId || undefined,
        isActive: form.isActive,
        meta,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed')
      setSaving(false)
      return
    }

    setShowForm(false)
    setEditId(null)
    setSaving(false)
    load()
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Products in it will lose their category.`)) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    load()
  }

  const topLevel = categories.filter((c) => !c.parentId)
  const children = categories.filter((c) => c.parentId)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">{categories.length} categories</p>
        </div>
        <Button size="sm" onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {editId ? 'Edit Category' : 'New Category'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Incubators"
              />
              <Input
                label="Slug (auto if empty)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. incubators"
              />
              <Input
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Parent Category</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Top level —</option>
                  {topLevel
                    .filter((c) => c.id !== editId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">Arabic Translation</p>
              <button
                type="button"
                onClick={autoTranslate}
                disabled={autoTranslating}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {autoTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                Auto-Translate
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Arabic Name (الاسم بالعربية)"
                dir="rtl"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="مثال: حاضنات"
                hint="Auto-translate fills this if empty — typing here always overrides it"
              />
              <Input
                label="Arabic Description (الوصف بالعربية)"
                dir="rtl"
                value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              Active (visible in store)
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" isLoading={saving} onClick={save}>
                <Check className="mr-1 h-4 w-4" />
                {editId ? 'Save' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : categories.length === 0 ? (
            <div className="py-10 text-center">
              <Tag className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">No categories yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Slug</th>
                  <th className="px-4 py-3 text-left font-medium">Parent</th>
                  <th className="px-4 py-3 text-center font-medium">Products</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topLevel.map((cat) => (
                  <>
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                      <td className="px-4 py-3 text-gray-400">—</td>
                      <td className="px-4 py-3 text-center text-gray-600">{cat._count?.products ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={cat.isActive ? 'success' : 'outline'}>
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(cat)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(cat.id, cat.name)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {children
                      .filter((c) => c.parentId === cat.id)
                      .map((child) => (
                        <tr key={child.id} className="hover:bg-gray-50 bg-gray-50/40">
                          <td className="pl-10 pr-4 py-2.5 text-gray-700">↳ {child.name}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{child.slug}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-400">{cat.name}</td>
                          <td className="px-4 py-2.5 text-center text-gray-500">{child._count?.products ?? 0}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant={child.isActive ? 'success' : 'outline'}>
                              {child.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => startEdit(child)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => remove(child.id, child.name)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </>
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
