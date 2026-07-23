'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, GripVertical, Loader2, ImageIcon } from 'lucide-react'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
}

export function ImageUploader({ images, onChange, maxImages = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return

    const remaining = maxImages - images.length
    if (remaining <= 0) {
      setError(`Maximum ${maxImages} images`)
      return
    }

    setUploading(true)
    setError('')

    const uploaded: string[] = []
    for (const file of list.slice(0, remaining)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        uploaded.push(url)
      } else {
        const d = await res.json()
        setError(d.error ?? 'Upload failed')
      }
    }

    onChange([...images, ...uploaded])
    setUploading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) {
      uploadFiles(e.dataTransfer.files)
    }
  }

  function remove(idx: number) {
    onChange(images.filter((_, i) => i !== idx))
  }

  // Drag-to-reorder
  function onDragStart(idx: number) { setDragIdx(idx) }
  function onDragEnter(idx: number) { setOverIdx(idx) }
  function onDragEnd() {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const next = [...images]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(overIdx, 0, moved)
      onChange(next)
    }
    setDragIdx(null)
    setOverIdx(null)
  }

  const canAdd = images.length < maxImages

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-blue-600 font-medium">Uploading…</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Drop images here or <span className="text-blue-600">browse</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  JPEG · PNG · WebP · GIF · max 10 MB each
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnter={() => onDragEnter(i)}
              onDragEnd={onDragEnd}
              className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                i === 0 ? 'border-blue-500' : 'border-gray-200'
              } ${dragIdx === i ? 'opacity-40 scale-95' : 'opacity-100'} ${
                overIdx === i && dragIdx !== i ? 'border-blue-400 scale-105' : ''
              }`}
            >
              <Image src={url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="120px" />

              {/* Primary badge */}
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                  Main
                </span>
              )}

              {/* Drag handle */}
              <div className="absolute bottom-1 left-1 hidden cursor-grab group-hover:flex">
                <GripVertical className="h-3.5 w-3.5 text-white drop-shadow" />
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow group-hover:flex"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-gray-400">
          {images.length}/{maxImages} images · Drag to reorder · First image is the main photo
        </p>
      )}

      {images.length === 0 && !canAdd && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ImageIcon className="h-4 w-4" />
          No images yet
        </div>
      )}
    </div>
  )
}
