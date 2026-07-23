import { NextResponse } from 'next/server'
import sharp from 'sharp'

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <rect x="42" y="28" width="16" height="16" rx="8" fill="white"/>
  <rect x="42" y="50" width="16" height="26" rx="4" fill="white"/>
  <rect x="34" y="50" width="32" height="6" rx="3" fill="rgba(255,255,255,0.3)"/>
</svg>`

export async function GET() {
  const png = await sharp(Buffer.from(SVG)).resize(512, 512).png().toBuffer()
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
  })
}
