# DealSpot — Affiliate + Blog Deals Website

## Project Overview
- **Name**: DealSpot
- **Goal**: A fast, SEO-focused, multi-category "best deals" website that combines an
  affiliate monetization engine (deal/review/comparison pages routed through cloaked,
  click-logged links to Amazon, Flipkart & more) with a content/authority engine (blog +
  buying guides). Built to rank on Google and get cited in AI Overviews.
- **Niche**: Multi-category Indian e-commerce deals — Mobiles, Tech & Gadgets, Home
  Appliances, Home & Kitchen, Outdoor & Sports, Fashion.
- **Stack**: Hono (SSR) + TypeScript + Cloudflare Pages/Workers + Cloudflare D1 (SQLite) +
  Tailwind (CDN). This is the lightweight edge-native adaptation of the original
  Next.js + Supabase master plan — every architectural goal is preserved.

## Design System — "Quiet Luxury" Editorial
A bespoke, high-end editorial look (Wirecutter / Kinfolk register) — deliberately *not* a
generic template.
- **Palette**: warm off-white `#FCFBF9` background · deep slate ink `#1C1917` (never pure
  black) · single sophisticated accent **deep terracotta** `#9A3F2B`, used sparingly for
  links, primary buttons and rules only.
- **Typography**: **Playfair Display** for headings (tight tracking, editorial serif) +
  **Inter** for body at line-height ~1.75. Drop caps on long-form articles.
- **Layout**: generous whitespace (`py-16`–`py-24`), asymmetric 60/40 & 7/5 editorial
  splits (large lead + stacked secondary), hairline `1px` borders instead of heavy shadows,
  barely-there hover shadow + `-translate-y-1` lift.
- **Affiliate / trust**: understated "Check Price at [Retailer]" and "Read review" CTAs
  (no aggressive BUY NOW), "Editor's Choice" / "Best Value" award pills, "Tested by [Name]"
  badges, author bylines with role + read time, minimalist gold rating stars.
- Tokens live in `public/static/style.css` (CSS variables) and `tailwind.config` in
  `src/views/layout.tsx`.

## Live / Dev URLs
- **Local dev (sandbox)**: served on port 3000 via PM2 + `wrangler pages dev`
- **Public sandbox URL**: (use GetServiceUrl / Deploy tab — regenerated per session)
- **Production**: not yet deployed (see "Deployment" below)

## Currently Completed Features
- **Homepage** (`/`) — hero search, category grid, top picks, buying guides, latest deals,
  newsletter CTA, blog teasers.
- **Deals listing** (`/deals`) — all published deals.
- **Category pages** (`/category/:slug`) — deals + buying guides per category.
- **Review / money pages** (`/reviews/:slug`) — product gallery, multi-retailer price box
  (cheapest highlighted), pros/cons, markdown review, FAQ, related deals.
- **Blog index** (`/blog`) + **single post** (`/blog/:slug`) — markdown body, author/date,
  embedded product comparison tables for pillar posts, FAQ, related reading.
- **Buying guides / pillar pages** (`/guides`) — "best of" roundups linked to deals.
- **Search** (`/search?q=...`) — searches deals + posts (noindexed).
- **Affiliate redirect + click logging** (`/go/:slug`) — 302-redirects to the real tagged
  URL and logs each click (link, source page, retailer, UA, country) to D1.
- **Newsletter signup** (`POST /api/subscribe`) — stores emails in D1.
- **SEO layer**:
  - JSON-LD: Organization, WebSite, BreadcrumbList, Article/BlogPosting, Product +
    AggregateRating + **Review (star ratings for SERP)**, FAQPage, ItemList.
  - Canonical tags, unique titles/descriptions, Open Graph + Twitter cards per page.
  - Dynamic `sitemap.xml` (auto-includes all deals/posts/categories/**hubs**).
  - `robots.txt` (disallows `/go/`, `/search`, `/api/`, `/compare`).
  - `rss.xml` feed for blog posts.

### Phase 5 — Engagement, SEO & Performance
- **Dynamic Hub-and-Spoke** (`/best`, `/best/:slug`) — programmatic "best-of" collections that
  pull spoke reviews automatically by rule (`manual` curated picks, `category`, `feature`, or
  `price` ceiling). Auto internal-links to every spoke review + sticky contents nav, comparison
  matrix, and ItemList JSON-LD.
- **Faceted Search & Filtering** (on `/deals` + `/category/:slug`) — sidebar filtering by
  **price range, user rating, brand and features simultaneously**, instant client-side, no reload.
- **Interactive Comparison Matrix** — "Compare" toggle on every product card → sticky compare
  tray (max 4, `localStorage`) → `/compare?ids=` matrix comparing price, rating, brand, award,
  specs and features, with lowest-price & top-rated highlights.
- **Smart dark/light theme** — animated flame toggle, modern **indigo + teal + coral**
  palette (cool slate neutrals) in both light and dark modes, brand-gradient announcement
  bar, no-flash inline script, `prefers-color-scheme` fallback, localStorage memory.
  Theme tokens use RGB-channel CSS variables so Tailwind opacity modifiers work everywhere.
- **Performance** — strict image `width`/`height` (zero CLS), lazy images, skeleton loaders, and
  heavy matrices lazy-revealed on scroll via `IntersectionObserver`. Respects `prefers-reduced-motion`.
- **Rich product blog** — 10 in-depth posts (long-term reviews, head-to-heads, setup & buying
  guides) with bylines, deks, read times, linked products, embedded matrices, and FAQ schema.

### Admin Blog Editor (private)
A self-contained, password-protected CMS at **`/admin`** for writing and managing blog posts —
no third-party CMS required, fully Cloudflare-Workers-native (Web Crypto auth, D1 storage).
- **Login**: `/admin/login` — password checked server-side against the `ADMIN_PASSWORD` secret.
  On success an HMAC-signed, 12-hour cookie token (signed with `ADMIN_SECRET`) is issued.
- **Dashboard**: lists all posts (published + drafts) with view/edit/delete actions.
- **Editor**: full Markdown body editor + title, auto-slug, dek, excerpt, cover image, category,
  type, read-time, author/role, and Published / Buying-guide (pillar) toggles. Slug-uniqueness
  validated. New posts appear instantly on `/blog`, the sitemap and RSS.
- **Security**: `/admin*` is `noindex,nofollow` and disallowed in `robots.txt`; cookie is
  `HttpOnly; Secure; SameSite=Lax`.
- **Setup secrets** (production):
  ```bash
  npx wrangler pages secret put ADMIN_PASSWORD   # your private password
  npx wrangler pages secret put ADMIN_SECRET      # any long random string for signing
  ```
  Local dev reads these from `.dev.vars` (git-ignored). Default local password: `dealspot-admin`.
- **Legal/compliance**: `/affiliate-disclosure`, `/privacy-policy`, `/terms-of-service`,
  `/about`, `/contact`, sitewide affiliate disclosure in footer, per-page affiliate notice,
  and a cookie-consent banner.
- **Custom 404** that links back into the content hierarchy.

## Functional Entry URIs
| Path | Method | Purpose |
|---|---|---|
| `/` | GET | Homepage |
| `/deals` | GET | All deals (with faceted filter sidebar) |
| `/category/:slug` | GET | Category page (e.g. `/category/mobiles`) with facets |
| `/best` | GET | Hub index — all best-of collections |
| `/best/:slug` | GET | Hub page — spokes pulled programmatically by rule |
| `/compare?ids=1,2,3` | GET | Side-by-side comparison matrix (max 4) |
| `/admin` | GET | **Admin dashboard** (auth-gated) — list/manage posts |
| `/admin/login` | GET/POST | Admin sign-in (password) |
| `/admin/new` | GET/POST | Create a blog post (Markdown editor) |
| `/admin/edit/:id` | GET/POST | Edit a post |
| `/admin/delete/:id` | POST | Delete a post |
| `/admin/logout` | POST | Sign out |
| `/reviews/:slug` | GET | Single product review / money page |
| `/blog` | GET | Blog index |
| `/blog/:slug` | GET | Single post / pillar guide |
| `/guides` | GET | Buying guides (pillar pages) |
| `/search?q=` | GET | Search deals + posts |
| `/go/:slug?from=` | GET | Affiliate redirect + click logger |
| `/api/subscribe` | POST | Newsletter signup (`{email, from}`) |
| `/affiliate-disclosure`, `/privacy-policy`, `/terms-of-service`, `/about`, `/contact` | GET | Legal / static |
| `/sitemap.xml`, `/robots.txt`, `/rss.xml` | GET | SEO endpoints |

## Data Architecture
- **Storage**: Cloudflare D1 (SQLite) — see `migrations/0001_initial_schema.sql`.
- **Data models**:
  - `categories` — top-level categories.
  - `affiliate_links` — single source of truth for outbound URLs (swap a link site-wide
    in one place). Referenced via `/go/:slug`.
  - `deals` — products (the money items): title, brand, image, rating, pros/cons, markdown review.
  - `offers` — per-retailer price for a deal, tied to an `affiliate_link`.
  - `posts` — blog posts + pillar guides (markdown body).
  - `post_deals` — M:N link so a "best of" post lists multiple deals.
  - `faqs` — Q&A attached to a post or deal (powers FAQPage schema).
  - `clicks` — first-party affiliate click analytics.
  - `subscribers` — newsletter emails.
- **Data flow**: blog/pillar posts build topical authority and internal-link into deal/review
  pages; deal pages convert via `/go/:slug` cloaked links; clicks logged to D1 tie revenue
  intent back to the source page.

## User Guide
1. Browse deals from the homepage, a category, or search.
2. Open a review to see the multi-retailer price box, pros/cons and honest verdict.
3. Click "Buy on Amazon/Flipkart" — you're routed through `/go/:slug` (click logged) to the
   retailer.
4. Read buying guides under **Buying Guides** for "best of" comparisons.
5. Subscribe to the newsletter for deal updates.

### Editing content
All content lives in D1. Edit/seed it with:
```bash
# edit seed.sql then:
npm run db:seed                 # re-seed local DB
npm run db:console:local        # or run ad-hoc SQL (wrangler d1 execute ... --local)
```
The single `affiliate_links` table is the place to update a destination URL site-wide.

## Local Development
```bash
npm run build                   # build to dist/ (required before first start)
npm run db:migrate:local        # apply migrations to local SQLite
npm run db:seed                 # load sample data
pm2 start ecosystem.config.cjs  # start on http://localhost:3000
# reset DB from scratch:
npm run db:reset
```

## Deployment
- **Platform**: Cloudflare Pages (project name: `dealspot`).
- **Status**: ❌ Not yet deployed to production.
- **Before deploying**:
  1. Create the production D1 DB: `npx wrangler d1 create dealspot-production` and paste the
     returned `database_id` into `wrangler.jsonc`.
  2. Apply migrations to prod: `npm run db:migrate:prod`.
  3. Seed/insert your real content & real affiliate links.
  4. Update `SITE.url` in `src/types.ts` to your real domain.
  5. Deploy via the Cloudflare deploy flow (`npm run deploy`).

## Features Not Yet Implemented
- Real affiliate links (seed data uses placeholder tagged URLs — replace before going live).
- An admin UI for non-technical editing (content is currently managed via SQL/seed).
- Pagination on blog/deal listings (currently capped lists).
- Price-history tracking / automated price refresh.
- Analytics dashboards (GA4 / Clarity script slots — add your IDs in `layout.tsx`).
- Email delivery for the newsletter (emails are stored; no sending integration yet).

## Recommended Next Steps
1. **Lock in your real affiliate IDs** (Amazon Associates, Flipkart, EarnKaro/Cuelinks) and
   replace the placeholder `dest_url`s in `affiliate_links`.
2. **Deploy to Cloudflare Pages** and connect a custom domain.
3. **Verify** Google Search Console + Bing Webmaster + GA4 + Clarity (paste tags into the
   `<head>` in `src/views/layout.tsx`).
4. **Build out one full pillar cluster** (1 guide + 6–12 supporting posts + the deals they
   reference) before broadening.
5. Add **pagination** and a simple **admin** workflow once content volume grows.

## Tech Stack
- Hono 4 (SSR JSX/HTML) · TypeScript · Vite · Wrangler
- Cloudflare Pages + Workers runtime · Cloudflare D1 (SQLite)
- Tailwind CSS (CDN) · Font Awesome (CDN)

**Last Updated**: 2026-06-24 (indigo/teal/coral theme + top-bar visibility fix)
