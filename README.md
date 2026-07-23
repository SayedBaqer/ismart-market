# iSmart Market — Multi-Vendor E-Commerce & Business Management Platform

**Version:** 1.0.0  
**Base currency:** BHD  
**Stack:** Next.js 15 · TypeScript · PostgreSQL · Prisma · Tailwind CSS

---

## Overview

iSmart Market is a full-stack multi-vendor marketplace platform built for small and medium retail businesses in Bahrain. It combines a public-facing storefront, a shop owner portal, and a super-admin backend in one unified codebase.

---

## Features

- Multi-vendor marketplace with shop registration and approval flow
- Super admin dashboard — shops, products, orders, stock, billing, reports
- Shop owner portal — orders, stock, prices, social links, page builder
- Customer-facing storefront with cart, checkout, and order tracking
- FIFO stock tracking with cost management
- Invoice / estimate / purchase order generation with PDF export
- Social media integration (Instagram, WhatsApp, Facebook, TikTok)
- PWA-ready (installable on mobile)
- Arabic + English support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon on production) |
| ORM | Prisma |
| Auth | NextAuth v5 |
| Styling | Tailwind CSS |
| Images | Cloudinary |
| Hosting | Vercel |

---

## Getting Started (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env.local

# 3. Push schema to database
npx prisma db push

# 4. Seed default data
npx prisma db seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default admin login:**
- Email: `admin@ismart.market`
- Password: `admin123456`
- ⚠️ Change this immediately after first login

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLOUDINARY_URL` | Cloudinary API env var for image uploads |
| `AUTH_SECRET` | Random 32+ char string for session signing |
| `NEXTAUTH_URL` | Full URL of your deployed site |
| `NEXT_PUBLIC_APP_URL` | Same as NEXTAUTH_URL |
| `NEXT_PUBLIC_APP_NAME` | `iSmart Market` |
| `NEXT_PUBLIC_BASE_CURRENCY` | `BHD` |

---

## Deployment

Deployed on **Vercel** with automatic deploys on every push to `master`.

Build command:
```
npx prisma generate && npx prisma db push --accept-data-loss && npx prisma db seed && next build
```
