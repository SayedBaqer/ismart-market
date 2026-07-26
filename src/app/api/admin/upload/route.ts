import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import sharp from 'sharp'
import { uploadImageBuffer } from '@/lib/upload'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.formData()
  const file = data.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Max 10 MB' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const isGif = file.type === 'image/gif'
  const processed = isGif
    ? buffer
    : await sharp(buffer).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()

  const ext = isGif ? 'gif' : 'webp'
  const contentType = isGif ? 'image/gif' : 'image/webp'

  try {
    const url = await uploadImageBuffer(processed, contentType, ext)
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
