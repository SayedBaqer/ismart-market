'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploader } from '@/components/admin/image-uploader'
import { Tag, Package, Warehouse, Info, ImageIcon, Instagram } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductFormProps {
  categories: Category[]
  initialData?: {
    id: string
    name: string
    sku: string | null
    description: string | null
    price: string
    comparePrice: string | null
    categoryId: string | null
    isActive: boolean
    isHidden: boolean
    trackStock: boolean
    images: string[]
    weight: string | null
    meta?: Record<string, unknown>
    initialQty?: number
    initialCostBhd?: number
    instagramUrl?: string
  }
}

export function ProductForm({ categories, initialData }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [name, setName] = useState(initialData?.name ?? '')
  const [sku, setSku] = useState(initialData?.sku ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [price, setPrice] = useState(initialData?.price ?? '')
  const [comparePrice, setComparePrice] = useState(initialData?.comparePrice ?? '')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '')
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)
  const [trackStock, setTrackStock] = useState(initialData?.trackStock ?? true)
  const [isHidden, setIsHidden] = useState(initialData?.isHidden ?? false)
  const [weight, setWeight] = useState(initialData?.weight ?? '')
  const [images, setImages] = useState<string[]>(initialData?.images ?? [])
  const [instagramUrl, setInstagramUrl] = useState(initialData?.instagramUrl ?? '')
  const [meta] = useState<Record<string, unknown>>(initialData?.meta ?? {})

  // Stock (only for new products)
  const [initialQty, setInitialQty] = useState(String(initialData?.initialQty ?? 0))
  const [initialCostBhd, setInitialCostBhd] = useState(String(initialData?.initialCostBhd ?? ''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim()) { setError('Product name is required'); return }
    if (!price || isNaN(Number(price))) { setError('Valid price is required'); return }

    setLoading(true)
    setError('')

    const payload = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      description: description.trim() || undefined,
      price: Number(price),
      comparePrice: comparePrice ? Number(comparePrice) : undefined,
      categoryId: categoryId || undefined,
      isActive,
      isHidden,
      trackStock,
      images,
      weight: weight ? Number(weight) : undefined,
      meta: { ...meta, ...(instagramUrl.trim() ? { instagramUrl: instagramUrl.trim() } : { instagramUrl: undefined }) },
      ...(!isEdit && {
        initialQty: Number(initialQty) || 0,
        initialCostBhd: Number(initialCostBhd) || 0,
      }),
    }

    const url = isEdit ? `/api/products/${initialData.id}` : '/api/products'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save product')
      setLoading(false)
      return
    }

    router.push('/admin/products')
    router.refresh()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" /> Product Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Product Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Digital Incubator 48 Eggs"
          />
          <Input
            label="SKU (auto-generated if empty)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. IB-0001"
            hint="Leave empty to auto-generate based on existing SKUs"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Product description…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" /> Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Sale Price *"
            type="number"
            min={0}
            step={0.001}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.000"
          />
          <Input
            label="Compare Price (strikethrough)"
            type="number"
            min={0}
            step={0.001}
            value={comparePrice}
            onChange={(e) => setComparePrice(e.target.value)}
            placeholder="0.000"
            hint="Shown as original price before discount"
          />
        </CardContent>
      </Card>

      {/* Instagram link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Instagram className="h-4 w-4" /> Instagram Post Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Instagram Post URL (optional)"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/p/..."
            hint="Cross-promote this product from an Instagram post. Price and stock are still managed here."
          />
        </CardContent>
      </Card>

      {/* Category & visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="h-4 w-4" /> Category & Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— No Category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Weight (kg) — optional"
            type="number"
            min={0}
            step={0.001}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            {[
              { label: 'Published (visible in store)', value: isActive, set: setIsActive },
              { label: 'Track stock & FIFO', value: trackStock, set: setTrackStock },
              { label: 'Hidden from store (usable in invoices)', value: isHidden, set: setIsHidden },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                <button
                  type="button"
                  onClick={() => set(!value)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
                {label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4" /> Product Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploader images={images} onChange={setImages} maxImages={10} />
        </CardContent>
      </Card>

      {/* Initial stock (create only) */}
      {!isEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Warehouse className="h-4 w-4" /> Initial Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              Set opening stock. Creates a FIFO batch with the cost information.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Initial Quantity"
                type="number"
                min={0}
                value={initialQty}
                onChange={(e) => setInitialQty(e.target.value)}
                placeholder="0"
              />
              <Input
                label="Unit Cost (BHD)"
                type="number"
                min={0}
                step={0.001}
                value={initialCostBhd}
                onChange={(e) => setInitialCostBhd(e.target.value)}
                placeholder="0.000"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/products')}>Cancel</Button>
        <Button isLoading={loading} onClick={submit}>
          {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </div>
  )
}
