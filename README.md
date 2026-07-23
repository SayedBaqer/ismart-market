# ibird Portal — Professional E-Commerce & Business Management Platform

**Version:** 1.0.0 (Planning → Build)
**Primary market:** Small/medium retail & trading businesses (iBird Electronics, Bahrain)
**Base currency:** BHD
**Stack:** Next.js 15 · TypeScript · PostgreSQL · Prisma · Shadcn/UI · Tailwind CSS

---

## Vision

A self-hosted, security-hardened, fully customizable business portal combining:

- **Online storefront** (WooCommerce-class) — product catalogue, categories, shopping cart, orders
- **Back-office** — inventory, FIFO stock, assemblies, purchase orders, invoices, customers
- **Sales & CRM** — orders management, customer records, invoices, estimates, P&L
- **News & Content** — home page sections (news, featured, promotions) — flexible layout
- **Plugin architecture** — extend without touching core (hooks + filter system)
- **Responsive everywhere** — web / desktop / mobile (PWA-installable)
- **Bilingual** — English / Arabic (RTL) with per-user toggle

**Relationship to iStock Suite:** ibird Portal _replaces_ WooCommerce as the storefront and _absorbs_ the functionality of iStock Suite (cost, stock, billing) into a unified codebase. The iStock Suite plugin remains usable on the existing WordPress installation; this portal is the next-generation standalone system.

---

## Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 15** (App Router) | SSR/SSG/ISR for SEO + API routes in one codebase |
| Language | **TypeScript** | Type safety across frontend and backend |
| Database | **PostgreSQL** | Complex queries, FIFO, JSON fields, full-text search |
| ORM | **Prisma** | Type-safe queries, migrations, prevents SQL injection |
| Auth | **NextAuth.js v5** | Multi-provider, JWT + DB sessions, role-based |
| UI | **Shadcn/UI + Tailwind CSS** | Professional, accessible, fully customizable |
| State | **Zustand** (client) + **React Query** | Cart, user state; server-state caching |
| PDF | **React-PDF / @react-pdf/renderer** | Server-side PDF for invoices |
| File uploads | **UploadThing** or local storage | Product images, receipts |
| Search | **PostgreSQL full-text** (phase 1) → Meilisearch (phase 2) | Start simple, scale later |
| Email | **Resend** (optional, off by default) | Transactional, no SMTP server needed |
| Charts | **Recharts** (bundled, no CDN) | Dashboards, trends |
| Plugin registry | **Custom hook/filter system** | WordPress-inspired, TypeScript-safe |
| Deployment | **Docker Compose** or Node server | Self-hosted, VPS or shared hosting |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ibird Portal                                   │
│                                                                         │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │   Storefront     │   │   Admin Portal   │   │   Mobile PWA     │   │
│  │  (public pages)  │   │  (back-office)   │   │  (installable)   │   │
│  │                  │   │                  │   │                  │   │
│  │ Home · Products  │   │ Dashboard · Stock│   │ Stock · Invoices │   │
│  │ Cart · Checkout  │   │ Orders · Billing │   │ Customers · Scan │   │
│  │ News · Search    │   │ Reports · Users  │   │ Assembly · POS   │   │
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘   │
│           └──────────────────────┼──────────────────────┘             │
│                                  │                                      │
│  ┌───────────────────────────────▼────────────────────────────────┐   │
│  │                      Next.js API Routes (/api/*)               │   │
│  │          REST · plugin hooks · permission middleware            │   │
│  └───────────────────────────────┬────────────────────────────────┘   │
│                                  │                                      │
│  ┌───────────────────────────────▼────────────────────────────────┐   │
│  │                 Core Services (TypeScript)                      │   │
│  │  ProductService · StockService · OrderService · BillingService  │   │
│  │  CostService (FIFO) · AssemblyService · CustomerService         │   │
│  │  PluginRegistry · HookSystem · CacheService                     │   │
│  └───────────────────────────────┬────────────────────────────────┘   │
│                                  │                                      │
│  ┌───────────────────────────────▼────────────────────────────────┐   │
│  │                   PostgreSQL (via Prisma)                       │   │
│  │  products · categories · stock · fifo_batches · orders          │   │
│  │  invoices · customers · assemblies · users · plugins             │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │              Plugin Layer (extension points)                    │   │
│  │  istock-plugin · billing-plugin · pos-plugin · custom-plugins   │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Storefront (Public)
- **Home page** — fully configurable sections: hero banner, news/blog posts, featured products, category grid, promotions, custom sections via plugins
- **Product catalogue** — listing with filters (category, price, stock), search, pagination, mobile-friendly grid
- **Product page** — images gallery, description, variants (size/color/spec), stock status, related products
- **Shopping cart** — persistent, guest + logged-in, real-time stock check
- **Checkout** — address, shipping methods, payment gateway hooks (plugins add gateways)
- **Customer account** — order history, addresses, wishlist
- **News/Blog** — posts, categories, featured on home page

### Admin — Product Management
- Product CRUD: title, description, images (multi), SKU (auto-sequential with prefix detection), price, cost, stock
- Category management (hierarchical, unlimited depth)
- Product variants (attributes + combinations)
- **Active in store** toggle (publish/hidden)
- Bulk operations (price update, category assign, stock set)
- Import/export CSV

### Admin — Inventory & Stock (from iStock Suite)
- **FIFO cost engine** — batches, weighted average cost (CNY / BHD / USD)
- **Set absolute quantity** — idempotent, logs movement
- **+/- adjustments**, **defects** (with cost preview), **manual** adjustments
- **FIFO batches** — view, delete, recompute avg cost
- **Stock movements** log per product
- **Low stock / out-of-stock** dashboard alerts
- **Disable / hide** items (global or store-only)
- **Disable whole category** from store

### Admin — Assemblies / Bundles
- Build product from component parts × qty + external items + extra charges
- Rolled-up unit cost written to assembly product
- Sell-through: components consumed on sale (FIFO)
- Clone recipe; manage from desktop and mobile

### Admin — Sales & Billing (from iStock Billing)
- **Documents:** invoices, estimates/quotes, purchase orders, sales orders, credit notes
- Document lifecycle: draft → finalise (number assigned) → sent → paid → void
- Payment recording (partial, full, multiple payments per invoice)
- **Customers & suppliers** — CRUD, inline quick-add (name + mobile)
- PDF generation — Classic / Modern / Minimal themes, branded
- **Expenses** — categories, recurrence (once/monthly/yearly)
- **P&L reports** — sales, COGS, gross profit, expenses, net profit; monthly trends
- Serial numbers + warranty per line item

### Admin — Orders Management
- Incoming storefront orders with status workflow
- WooCommerce import compatibility (migrate existing orders)
- Auto-deduct stock on order completion (configurable)
- Order → Invoice conversion

### Admin — Users & Roles
- Role-based access: Super Admin · Admin · Manager · Staff · Cashier · Customer
- Per-role permission matrix (granular capability flags)
- API tokens for mobile/integration access (90-day, regeneratable)

### Plugin System
- Hook/filter system (similar to WordPress `add_action` / `add_filter`)
- Plugin registry — register, activate, deactivate plugins without core changes
- Extension points: payment gateways, shipping methods, home page sections, report tabs, menu items, product fields, order actions
- Plugins as local TypeScript modules or npm packages
- First-party plugins (all optional, toggled in admin):
  - `istock-cost` — FIFO cost engine
  - `istock-billing` — full billing module
  - `istock-pos` — point-of-sale screen (v2)
  - `istock-zoho` — Zoho Books sync
  - `istock-barcode` — barcode scanning (v2)

### Responsive & Mobile
- Tailwind CSS mobile-first design
- PWA: installable, offline-capable dashboard + stock list
- Admin: works on tablet (kiosk mode) and phone
- Storefront: optimized for mobile commerce

### Security (hardened)
See [Security](#security) section below.

---

## Security

This portal is designed defence-first. Every layer applies the relevant control:

### Authentication & Authorization
- **NextAuth.js v5** — sessions signed with RS256 JWT; refresh token rotation
- **Role-based capability system** — every API route checks specific capability flags, not just role names
- **API tokens** — hashed (bcrypt) in DB; compare with `timingSafeEqual`; never logged; regeneratable
- **Brute-force protection** — rate limit login endpoint (5 attempts / 15 min per IP, via Upstash Redis or in-memory)
- **Session fixation** — session ID rotated on privilege change

### Input & Output
- **Prisma ORM** — parameterized queries everywhere; raw SQL only with tagged template literals (SQL injection impossible via ORM layer)
- **Zod** — schema validation on every API route input; reject unknowns
- **Output escaping** — React escapes by default; `dangerouslySetInnerHTML` never used without DOMPurify sanitization
- **File uploads** — MIME type checked server-side; filenames sanitized; stored outside web root or in object storage
- **XSS** — Content Security Policy (CSP) header blocking inline scripts and unknown sources

### Transport & Headers
- **HTTPS enforced** — HSTS header set; no HTTP allowed in production
- **Security headers** (set in `next.config.js`):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` — restrict camera, microphone, geolocation
  - `Content-Security-Policy` — strict allowlist
- **CORS** — API routes only accept from own origin; third-party access via explicit CORS policy

### Data
- **Secrets** in environment variables only (`.env.local`, never in code or git)
- **Passwords** hashed with bcrypt (cost factor 12)
- **PII** minimized; customer data encrypted at rest for sensitive fields (BHD amounts, tax numbers)
- **Audit log** — all admin mutations logged (user, action, resource, timestamp, IP)

### Plugin System Security
- Plugins run in the same Node.js process but are sandboxed by TypeScript types and the hook API
- No plugin can bypass Prisma's parameterized queries (no raw DB access from plugins)
- Plugin activation requires Super Admin; each plugin declares its required capabilities

### Dependency Security
- `npm audit` in CI; dependabot alerts enabled
- Lock file committed (`package-lock.json`)
- No CDN dependencies in production (all assets bundled)

---

## Database Schema (Overview)

```
products           categories           users
  id                 id                   id
  sku (unique)       name                 email
  name               slug                 password_hash
  slug               parent_id            role
  description        image_url            capabilities (jsonb)
  price              display_order        api_token_hash
  images (jsonb)     meta (jsonb)         created_at
  category_id ──────►
  is_active
  meta (jsonb)     product_variants     orders
                     id                   id
stock_meta           product_id ──►       customer_id
  id                 sku                  status
  product_id ──►     attributes (jsonb)   line_items (jsonb)
  avg_cost_cny       price                subtotal
  avg_cost_bhd       stock_qty            tax_total
  stock_limit                             grand_total
  threshold        fifo_batches           payment_method
  notes              id                   shipping_address (jsonb)
                     product_id ──►       created_at
                     qty_received
                     qty_remaining      assemblies
                     unit_cost_cny        id
                     date                 product_id ──►
                                          components (jsonb)
stock_adjustments    customers            external_items (jsonb)
  id                 id                   extra_charge
  product_id ──►     display_name         total_cost
  type               mobile
  qty                email              documents (invoices/POs/etc)
  reason             is_supplier          id
  created_by         currency             doc_type
  created_at         notes                doc_number
                                          status
news_posts         plugins                customer_id ──►
  id                 slug                 line_items (jsonb)
  title              name                 grand_total
  content            version              created_at
  published_at       active
  image_url          config (jsonb)
```

Full Prisma schema lives in `prisma/schema.prisma`.

---

## Project Structure

```
ibird-portal/
├── app/                         # Next.js App Router
│   ├── (storefront)/            # Public store pages
│   │   ├── page.tsx             # Home — configurable sections
│   │   ├── products/            # Product listing & detail
│   │   ├── cart/                # Cart
│   │   ├── checkout/            # Checkout flow
│   │   ├── news/                # News/blog
│   │   └── account/             # Customer account
│   ├── admin/                   # Admin portal (protected)
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── stock/
│   │   ├── orders/
│   │   ├── assemblies/
│   │   ├── billing/
│   │   ├── customers/
│   │   ├── reports/
│   │   ├── users/
│   │   ├── news/
│   │   └── settings/
│   └── api/                     # API routes
│       ├── auth/
│       ├── products/
│       ├── stock/
│       ├── orders/
│       ├── documents/
│       ├── customers/
│       ├── reports/
│       └── plugins/
│
├── components/
│   ├── storefront/              # Public UI components
│   ├── admin/                   # Admin UI components
│   ├── shared/                  # Shared (buttons, modals, tables)
│   └── pdf/                     # PDF templates
│
├── lib/
│   ├── services/                # Business logic (one file per domain)
│   │   ├── product.service.ts
│   │   ├── stock.service.ts     # FIFO engine
│   │   ├── order.service.ts
│   │   ├── billing.service.ts
│   │   ├── assembly.service.ts
│   │   ├── customer.service.ts
│   │   └── report.service.ts
│   ├── plugins/                 # Plugin system
│   │   ├── registry.ts          # PluginRegistry singleton
│   │   ├── hooks.ts             # Hook/filter system
│   │   └── types.ts             # Plugin API types
│   ├── auth/                    # Auth helpers, capabilities
│   ├── db/                      # Prisma client singleton
│   ├── cache/                   # Cache helpers (Redis / in-memory)
│   └── validators/              # Zod schemas per domain
│
├── plugins/                     # First-party plugins
│   ├── istock-cost/             # FIFO cost engine plugin
│   ├── istock-billing/          # Full billing module
│   └── istock-pos/              # POS (v2)
│
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/
│
├── public/
│   ├── manifest.json            # PWA manifest
│   └── sw.js                    # Service worker
│
├── middleware.ts                # Auth + security headers
├── next.config.js               # CSP, headers, image domains
├── tailwind.config.ts
├── package.json
└── .env.example                 # Template (never commit .env.local)
```

---

## Plugin System API

Plugins register via the `PluginRegistry`:

```typescript
// plugins/my-plugin/index.ts
import { definePlugin } from '@/lib/plugins/registry'

export default definePlugin({
  slug: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  register(hooks) {
    // Add a section to the home page
    hooks.addFilter('storefront.home.sections', (sections) => [
      ...sections,
      { id: 'my-section', component: MySection, order: 50 },
    ])

    // Add a tab to the admin dashboard
    hooks.addAction('admin.dashboard.tabs', (tabs) => {
      tabs.push({ id: 'my-tab', label: 'My Tab', component: MyTab })
    })

    // Add a payment gateway
    hooks.addFilter('checkout.payment_methods', (methods) => [
      ...methods,
      { id: 'my-gateway', label: 'My Payment', handler: MyGatewayHandler },
    ])

    // React to an order being completed
    hooks.addAction('order.completed', async (order) => {
      await myService.onOrderComplete(order)
    })
  },
})
```

### Available Hooks (extension points)

| Hook | Type | Description |
|---|---|---|
| `storefront.home.sections` | filter | Home page section list |
| `storefront.product.detail.tabs` | filter | Tabs on product page |
| `checkout.payment_methods` | filter | Payment gateway list |
| `checkout.shipping_methods` | filter | Shipping method list |
| `admin.menu.items` | filter | Admin sidebar menu |
| `admin.dashboard.tabs` | filter | Admin dashboard cards |
| `admin.product.fields` | filter | Extra fields on product form |
| `admin.report.tabs` | filter | Extra report tabs |
| `order.created` | action | After new storefront order |
| `order.completed` | action | After order marked complete |
| `stock.adjusted` | action | After any stock movement |
| `invoice.finalised` | action | After billing invoice issued |
| `api.middleware` | filter | Add middleware to API routes |

---

## Home Page — Configurable Sections

The home page is a list of **ordered sections** each rendered as a React component. Admin can reorder, enable/disable, and configure each section in **Settings → Home Page**:

| Section | Default | Description |
|---|---|---|
| `hero` | ON | Full-width banner with image, title, button |
| `featured-categories` | ON | Category grid (select which to show) |
| `featured-products` | ON | Hand-picked or auto (best-sellers, new) |
| `news` | ON | Latest N news posts |
| `promotions` | OFF | Banner or grid of promotional items |
| `custom-html` | OFF | Free HTML block (admin only) |
| *(plugin sections)* | — | Plugins add their own sections |

---

## Implementation Phases

### Phase 0 — Skeleton (Day 1 morning)
- `npx create-next-app` with TypeScript + Tailwind + App Router
- Prisma setup, PostgreSQL connection, base schema
- NextAuth.js v5 — credential provider, JWT sessions, role field
- Security headers in `next.config.js` and `middleware.ts`
- Plugin registry skeleton (`PluginRegistry`, `HookSystem`)
- Folder structure, path aliases, ESLint + Prettier

### Phase 1 — Products & Categories (Day 1)
- Prisma models: `Product`, `Category`, `ProductVariant`
- Product service: CRUD, auto-SKU, image upload
- Admin UI: product list (table + search), product form (all fields)
- Category UI: tree view, create/edit/delete
- API routes: `GET/POST /api/products`, `GET/PUT/DELETE /api/products/[id]`
- Storefront: product listing page, product detail page

### Phase 2 — Storefront & Home Page (Day 1–2)
- Home page with section system (hero, categories, featured products, news)
- Shopping cart (Zustand store, persisted to localStorage + server session)
- Checkout flow (address, shipping, payment placeholder)
- Customer account pages (order history)
- News/blog CRUD (admin) + listing page (public)
- Search (PostgreSQL full-text on name + description + SKU)

### Phase 3 — Stock & FIFO (Day 2)
- Prisma models: `StockMeta`, `FifoBatch`, `StockAdjustment`
- Stock service: FIFO engine (from iStock Suite), movement log, defects
- Admin: stock list, set quantity, +/- adjustment, FIFO batch view
- Dashboard: low stock / out-of-stock alerts

### Phase 4 — Orders Management (Day 2)
- Order model, status workflow
- Admin order list, order detail, status update
- Auto stock deduction on completion (configurable)
- Basic invoice generation from order

### Phase 5 — Assemblies (Day 2–3)
- Assembly model (components + external items + charge)
- Assembly CRUD in admin
- Cost roll-up → write to assembly product cost
- Sell-through: components consumed on order/invoice

### Phase 6 — Billing Module (Day 3)
- Documents model (invoice, estimate, PO, credit note)
- Document lifecycle, numbering, draft → finalise
- Payment recording, status derivation
- Customers CRUD with inline quick-add
- PDF generation (Classic + Modern themes)
- Expenses module + P&L report

### Phase 7 — Users, Roles & Security Hardening (Day 3)
- Role-based capability matrix
- Admin user management
- API token system (90-day, hashed)
- Audit log
- Rate limiting on auth endpoints
- Full security header review

### Phase 8 — Mobile PWA (Day 3–4)
- Service worker (Workbox or next-pwa)
- PWA manifest, icons
- Mobile-optimised admin screens: stock, invoices, customers
- Offline queue for invoice creation
- Install prompt

### Phase 9 — Plugin System & First-Party Plugins (Day 4)
- Plugin registry complete (activate/deactivate, config)
- `istock-cost` plugin (wraps Phase 3 stock service, adds UI hooks)
- `istock-billing` plugin (wraps Phase 6, adds menu hooks)
- Plugin admin UI (list, toggle, configure)

### Phase 10 — Polish & Production-Readiness
- i18n (English + Arabic / RTL with `next-intl`)
- Performance: ISR on product pages, image optimization
- `npm audit` pass, dependency review
- Docker Compose file for self-hosted deployment
- Environment variable documentation
- Backup strategy documentation

---

## Lessons from iStock Suite (applied here)

| iStock pattern | How it's used in this portal |
|---|---|
| Single source of truth for cost | `StockService` is the only writer to `stock_meta.avg_cost_*` |
| Idempotent stock writes | `setAbsoluteQty` reads back after write to confirm |
| Stable identifiers (id + SKU) | All cost/movement lookups use `product_id` (primary); name only for display |
| Transient/cache discipline | React Query + Redis transient; invalidate on any write |
| No polling | React Query staleTime; manual refresh button; webhooks for async |
| FIFO batch delete → resync | Batch delete recalculates `avg_cost` + rewrites `stock_qty` |
| Numbered documents — gap-safe | DB transaction + `SELECT FOR UPDATE` on sequence row |
| Per-unit serial + warranty | `document_items.serial` + `warranty` (inline per-unit boxes) |
| Bridge contract (iStock ↔ Billing) | Internal service calls only through typed service interfaces |
| Kiosk / full-screen mode | Admin `?kiosk=1` query param collapses sidebar for tablet POS |
| i18n JSON dictionary | `lib/i18n/ar.ts` + `useTranslation` hook |
| Offline PWA | Service worker caches product catalogue + customer list |

---

## Environment Variables

```bash
# .env.local (never commit this file)

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ibird_portal"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://yourdomain.com"

# File storage (local or cloud)
UPLOAD_DIR="./uploads"           # local
# or UPLOADTHING_SECRET=...      # cloud

# Optional: Redis (rate limiting + cache)
REDIS_URL="redis://localhost:6379"

# Optional: Email (off by default)
RESEND_API_KEY=""

# Optional: Zoho Books sync
ZOHO_CLIENT_ID=""
ZOHO_CLIENT_SECRET=""
ZOHO_REFRESH_TOKEN=""
```

---

## Quick Start (Development)

```bash
# 1. Clone / enter directory
cd "ibird Portal"

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# edit .env.local with your PostgreSQL URL and NEXTAUTH_SECRET

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed initial data (admin user, default categories, home sections)
npx prisma db seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the storefront.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin portal.

---

## Deployment (Self-Hosted)

```bash
# Docker Compose (recommended)
docker compose up -d

# Or manual
npm run build
npm start
```

`docker-compose.yml` includes: `app` (Next.js), `db` (PostgreSQL 16), `redis` (optional).

---

## Realism Check — 24-Hour Plan

Given 50% of Claude Pro for ~24 hours, this is achievable in a focused first sprint:

| Phase | Target | Risk |
|---|---|---|
| Phase 0 — Skeleton | ✅ Complete today | Low |
| Phase 1 — Products + Categories | ✅ Complete today | Low |
| Phase 2 — Storefront + Home | ✅ Start today, complete Day 2 | Medium |
| Phase 3 — Stock + FIFO | ✅ Day 2 | Medium |
| Phase 4 — Orders | ✅ Day 2 | Low |
| Phase 5 — Assemblies | 🟡 Day 2–3 | Medium |
| Phase 6 — Billing | 🟡 Day 3 | Medium–High |
| Phase 7 — Auth/Security | ✅ Woven through all phases | Low |
| Phase 8 — PWA | 🟡 Day 3–4 | Medium |
| Phase 9 — Plugin system | 🟠 Day 4 (skeleton now, polish later) | High |
| Phase 10 — Polish | 🔵 Ongoing | — |

**Recommended start:** Phase 0 now → Phase 1 next → iterating. Each phase is a working, shippable increment.

---

## Multi-Tenant Marketplace Roadmap (v2 / v3)

This is the long-term vision beyond the initial single-shop build.

### Platform mode: single ↔ multi (config toggle)

The database schema is **multi-tenant ready from Phase 0** — every core table has a nullable `shopId`. The platform mode is controlled by a single setting:

```
settings: platform.mode = 'single' | 'multi'
```

- **Single mode (default):** `shopId = null` everywhere. One shop, one admin. Looks and works exactly like WooCommerce. No multi-tenant UI visible.
- **Multi mode:** Each shop gets its own products, orders, billing. Platform admins oversee all shops. Shop admins see only their data.

### v2 — Multi-Shop Platform
- **Shop registration** — any business applies to open a shop (name, logo, contact, address)
- **Platform Admin** — dedicated admin role that approves/rejects shop applications
- **Per-shop admin panel** — each shop owner sees their own dashboard (only their products, orders, customers)
- **Product approval workflow** — shop lists a product → platform admin approves or rejects with a reason
- **Shop plans & billing** — FREE (limited, approval required) / STARTER / BUSINESS / ENTERPRISE tiers
- **Subdomain routing** — each shop on `shopname.yourplatform.com` or a custom domain
- **Shared product marketplace** — platform-wide browse of all approved shop products
- **Bilingual** — English / Arabic (RTL) per shop, per user

### v3 — Paid Features & Delivery Integration
- **Feature gating by plan** — features (analytics, barcode, priority support) unlocked per tier
- **Subscription billing** — recurring charges to shops (Stripe / local payment gateway plugin)
- **Delivery service integration** — link to local delivery providers (Talabat, Aramex, custom) or in-store pickup scheduling
- **Mobile app for shop owners** — manage stock, view orders, chat with platform support
- **Customer loyalty** — points, vouchers per shop
- **Terms & agreements** — shops must accept platform T&C before listing; legal record kept
- **Reviews & ratings** — customers review products; platform admin moderates

### Security model for multi-tenant

| Role | Scope | Can do |
|---|---|---|
| SUPER_ADMIN | Platform | See all shops, approve/reject, suspend shops, manage platform settings |
| SHOP_ADMIN | Own shop | Full control of their products, orders, billing, staff |
| SHOP_MANAGER | Own shop | Stock, orders, invoices (no settings) |
| SHOP_STAFF | Own shop | View + limited edits |
| CUSTOMER | All shops | Browse, buy, view own orders |

Every API route enforces `shopId` scoping — a shop admin can never read or write another shop's data (enforced at the service layer, not just the UI).

---

## Status

- [x] Architecture designed (single + multi-tenant)
- [x] iStock Suite features captured
- [x] iStock Billing spec captured
- [x] Phase 0 — Project skeleton (complete)
- [x] Phase 0 — Security headers + middleware
- [x] Phase 0 — Prisma schema (multi-tenant ready)
- [x] Phase 0 — NextAuth.js v5 + roles + capabilities
- [x] Phase 0 — Plugin registry + hook system
- [x] Phase 1 — Product & Category services + API routes (complete)
- [x] Phase 1 — Admin layout (sidebar, header)
- [x] Phase 1 — Shared UI components
- [ ] Phase 1 — Setup wizard (first-run)
- [ ] Phase 2 — Storefront home page + product listing
- [ ] Phase 3 — Stock & FIFO admin UI
- [ ] Phase 4 — Orders management
- [ ] Phase 5 — Assemblies
- [ ] Phase 6 — Billing (invoices, estimates, POs)
- [ ] Phase 7 — Users + audit log
- [ ] Phase 8 — Mobile PWA
- [ ] Phase 9 — Plugin admin UI
- [ ] Phase 10 — i18n (EN/AR) + polish
- [ ] Phase 11 (v2) — Multi-shop platform
- [ ] Phase 12 (v3) — Paid tiers + delivery integration
