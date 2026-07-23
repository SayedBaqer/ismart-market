import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function GET(req: NextRequest) {
  const size = Math.min(512, Math.max(16, Number(req.nextUrl.searchParams.get('size')) || 192))

  // ibird Portal icon — bold blue square with stylised "i" lettermark
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#2563eb"/>
        <stop offset="100%" style="stop-color:#1d4ed8"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#g)"/>
    <rect x="42" y="28" width="16" height="16" rx="8" fill="white"/>
    <rect x="42" y="50" width="16" height="26" rx="4" fill="white"/>
    <rect x="34" y="50" width="32" height="6" rx="3" fill="rgba(255,255,255,0.35)"/>
  </svg>`

  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
