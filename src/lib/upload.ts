import { createHash } from 'crypto'

/**
 * Uploads an already-processed image buffer to whichever storage is configured
 * (R2 preferred, Cloudinary fallback). Shared by the admin upload endpoint and
 * any server-side flow that needs to re-host a fetched image (e.g. Instagram import).
 */
export async function uploadImageBuffer(buffer: Buffer, contentType: string, ext: string): Promise<string> {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

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
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }))
    return `${process.env.R2_PUBLIC_URL}/${key}`
  }

  // ── Cloudinary (fallback) ────────────────────────────────────────────────
  if (process.env.CLOUDINARY_URL) {
    const match = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/)
    if (!match) throw new Error('Invalid CLOUDINARY_URL')
    const [, apiKey, apiSecret, cloudName] = match

    const timestamp = String(Math.floor(Date.now() / 1000))
    const folder = 'ismart'
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
    const signature = createHash('sha256').update(paramsToSign + apiSecret).digest('hex')

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(buffer)], { type: contentType }))
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
      throw new Error(err.error?.message ?? 'Upload failed')
    }
    const result = await res.json() as { secure_url: string }
    return result.secure_url
  }

  throw new Error('No image storage configured. Set R2_ACCOUNT_ID or CLOUDINARY_URL.')
}

/** Fetches an external image URL and re-hosts it on our own storage, processed like a normal upload. */
export async function rehostImageFromUrl(sourceUrl: string): Promise<string> {
  const sharp = (await import('sharp')).default
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`Failed to fetch source image (${res.status})`)
  const arrayBuffer = await res.arrayBuffer()
  const processed = await sharp(Buffer.from(arrayBuffer))
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
  return uploadImageBuffer(processed, 'image/webp', 'webp')
}
