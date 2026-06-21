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
    AggregateRating, FAQPage, ItemList.
  - Canonical tags, unique titles/descriptions, Open Graph + Twitter cards per page.
  - Dynamic `sitemap.xml` (auto-includes all deals/posts/categories).
  - `robots.txt` (disallows `/go/`, `/search`, `/api/`).
  - `rss.xml` feed for blog posts.
- **Legal/compliance**: `/affiliate-disclosure`, `/privacy-policy`, `/terms-of-service`,
  `/about`, `/contact`, sitewide affiliate disclosure in footer, per-page affiliate notice,
  and a cookie-consent banner.
- **Custom 404** that links back into the content hierarchy.

## Functional Entry URIs
| Path | Method | Purpose |
|---|---|---|
| `/` | GET | Homepage |
| `/deals` | GET | All deals |
| `/category/:slug` | GET | Category page (e.g. `/category/mobiles`) |
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

**Last Updated**: 2026-06-21
