import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { auth } from '@/auth'
import sharp from 'sharp'

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
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const contentType = isGif ? 'image/gif' : 'image/webp'

  // ── Cloudflare R2 (preferred — zero bandwidth cost) ──────────────────────
  if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID) {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
    const key = `uploads/${filename}`
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: processed,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }))
    const url = `${process.env.R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ url })
  }

  // ── Cloudinary (fallback) ────────────────────────────────────────────────
  if (process.env.CLOUDINARY_URL) {
    const match = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/)
    if (!match) return NextResponse.json({ error: 'Invalid CLOUDINARY_URL' }, { status: 500 })
    const [, apiKey, apiSecret, cloudName] = match

    const timestamp = String(Math.floor(Date.now() / 1000))
    const folder = 'ismart'
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
    const signature = createHash('sha256').update(paramsToSign + apiSecret).digest('hex')

    const form = new FormData()
    form.append('file', new Blob([processed], { type: contentType }))
    form.append('folder', folder)
    form.append('timestamp', timestamp)
    form.append('api_key', apiKey)
    form.append('signature', signature)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      return NextResponse.json({ error: err.error?.message ?? 'Upload failed' }, { status: 500 })
    }
    const result = await res.json() as { secure_url: string }
    return NextResponse.json({ url: result.secure_url })
  }

  return NextResponse.json({ error: 'No image storage configured. Set R2_ACCOUNT_ID or CLOUDINARY_URL.' }, { status: 500 })
}
