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
- **Deals listing** (`/deals`) — all published deals in the sortable, paginated catalogue grid.
- **Category pages** (`/category/:slug`) — **clean, catalogue-only** layout (no guide cards / no
  facet sidebar): a slim category title followed directly by the sortable, paginated product grid.
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
- **Catalogue Filter rail** (LEFT side of **every** catalogue — homepage, `/deals`, every
  `/category/:slug`, AND `/search` results) — instant, client-side, no reload. Filters:
  **dual-thumb price-range slider**, **customer rating** (4/3/2 ★ & up), **availability**
  (in stock / buy-now / on offer), **category**, **brand** (with a live brand search box), and
  **feature** toggle chips — all ANDed together. **Removable active-filter chips** sit at the top
  of the rail, a **Reset** clears everything, and a **live result count** updates as you filter.
  On mobile the rail collapses into a slide-in **Filters drawer** (with backdrop) opened from the
  sort bar, with a badge showing the number of active filters. Filtering runs *before* sorting and
  pagination, so the three work together on the same card list.
- **Interactive Comparison Matrix** — "Compare" toggle on every product card → sticky compare
  tray (max 4, `localStorage`) → `/compare?ids=` matrix comparing price, rating, brand, award,
  specs and features, with lowest-price & top-rated highlights.
- **Smart dark/light theme** — animated flame toggle, no-flash inline script,
  `prefers-color-scheme` fallback, localStorage memory. Theme tokens use RGB-channel
  CSS variables so Tailwind opacity modifiers work everywhere.
  - **Light mode**: warm vintage **"paper"** look (cream/ivory + deep wine/bordeaux
    accent + antique gold) with a hand-built, pure-CSS crumpled-paper texture
    (SVG fractal-noise grain + sepia crease blotches + vignette) for a classic,
    retro, luxury-fashion editorial feel.
  - **Dark mode**: deep navy slate with bright cyan/violet accents (clean, no texture).
- **Animated announcement bar** — colourful gradient strip with **multiple rotating
  fashion/trust messages** (new-season styles, free-shipping deals, up-to-70%-off, "we test
  before we recommend", hourly lightning deals) scrolling as a seamless right→left marquee
  (pauses on hover, respects reduced-motion).
- **Animated Home icon** in the main nav (before "Deals") — links to the homepage with a
  springy hover (gradient wash sweeps up, icon bobs) and a gentle looping attention ring.
- **Product Catalogue grid** (homepage, `/deals`, every `/category/:slug`) — dense responsive
  grid that is **5 columns × 4 rows = 20 per page on desktop** and **2 columns × 8 rows = 16 per
  page on mobile**, with **numbered pagination** (windowed `1 … n` with prev/next) below. Every
  product photo sits in a fixed square box with `object-contain` for perfect, uniform fit.
- **Flipkart-style "Sort By"** on every catalogue (homepage, deals, all categories, **and search
  results**): Relevance, Price Low→High, Price High→Low, Newest, Oldest, Popularity, Discount,
  **Customer Rating**. Sorting reorders the *filtered* cards client-side and re-paginates from
  page 1; products without a price sink to the bottom on price sorts.
- **Filter + Sort on search results** (`/search?q=`) — search now uses the same unified catalogue
  grid, so matching products get the full left filter rail + Sort By + pagination, with blog post
  matches listed below.
- **Performance** — strict image `width`/`height` (zero CLS), lazy images, skeleton loaders, and
  heavy matrices lazy-revealed on scroll via `IntersectionObserver`. Respects `prefers-reduced-motion`.
- **Rich product blog** — 10 in-depth posts (long-term reviews, head-to-heads, setup & buying
  guides) with bylines, deks, read times, linked products, embedded matrices, and FAQ schema.

### Hero Product Carousel (homepage)
- The **first, fully-visible element** on the homepage is a glassmorphism **product carousel**
  (8 banners). Each banner shows the **product image on the left** and **name, rating,
  short description, best price + Buy Now** on the right, over a frosted-glass gradient.
- **Consistent height across all products** — the banner is a fixed 380px tall and the body
  reserves uniform slots (eyebrow, 2-line title, rating, 2-line description) so the layout never
  grows/shrinks between products.
- **Image fits its container fully** (`object-fit: cover`) and **zooms within the container**
  on hover — the media box is `overflow: hidden` so the zoom is cleanly clipped.
- **Autoplays** automatically (**3s/slide**), with **small, tightly-aligned bubbly dots** that
  never overlap product content, prev/next arrows, swipe, keyboard arrows, and pause-on-hover/
  focus/tab-hidden. Respects `prefers-reduced-motion`.
- **Mobile-adaptive**: on phones each slide collapses to just the **product image + a compact
  Buy button** beneath it (links straight to the retailer via `/go/:slug`), like Flipkart/Amazon.
- **Admin-managed**: pick & order which up-to-8 products appear from **`/admin/carousel`**
  (drag to reorder; live "x / 8" counter; searchable product picker). If fewer than 8 are
  chosen, featured/latest products fill the rest so the hero is never empty. Selection is
  persisted in the `site_settings` table (key `hero_carousel`, JSON array of product IDs).

### Admin CMS (private)
A self-contained, password-protected admin at **`/admin`** — no third-party CMS required,
fully Cloudflare-Workers-native (Web Crypto auth, D1 storage). Manages **blog posts,
products (with prices & buy links), and the hero carousel.**
- **Login**: `/admin/login` — password checked server-side against the `ADMIN_PASSWORD` secret.
  On success an HMAC-signed, 12-hour cookie token (signed with `ADMIN_SECRET`) is issued.
  **Default password: `admin`.**
- **Posts**: dashboard lists all posts (published + drafts) with view/edit/duplicate/delete;
  full Markdown editor + SEO panel with live Google preview.
- **Products** (`/admin/products`): full catalogue manager. Create/edit/delete products with
  **name, slug, brand, image URL (with live preview), short + full description (Markdown),
  category, rating, pros/cons**, and a **dynamic multi-store "Prices & Buy links" section**
  (retailer, price, M.R.P., in-stock, Buy Now URL). The cheapest offer becomes the "best price";
  each Buy link is stored as a tracked affiliate link routed via `/go/:slug`. One-click
  publish/feature toggles. Deleting a product cleanly cascades its offers + affiliate links.
- **Carousel** (`/admin/carousel`): the product picker described above.
- **Images everywhere**: blog/product Markdown now embeds **bare image URLs on their own line**,
  pasted **raw `<img>` tags**, and `![alt](url)` syntax. All `<img>` use
  `referrerpolicy="no-referrer"` + an `onerror` fallback so hotlink-protected blog/CDN images
  (e.g. Blogspot) load reliably — fixing the earlier "image via link not showing" problem.
- **Security**: `/admin*` is `noindex,nofollow` and disallowed in `robots.txt`; cookie is
  `HttpOnly; Secure; SameSite=Lax`.
- **Setup secrets** (production):
  ```bash
  npx wrangler pages secret put ADMIN_PASSWORD   # your private password (overrides 'admin')
  npx wrangler pages secret put ADMIN_SECRET      # any long random string for signing
  ```
  Local dev reads these from `.dev.vars` (git-ignored). Default local password: `admin`.
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
| `/admin/login` | GET/POST | Admin sign-in (password — default `admin`) |
| `/admin/new` | GET/POST | Create a blog post (Markdown editor) |
| `/admin/edit/:id` | GET/POST | Edit a post |
| `/admin/delete/:id` | POST | Delete a post |
| `/admin/products` | GET | **Product catalogue manager** (list/search/filter) |
| `/admin/products/new` | GET/POST | Create a product (with image, prices & buy links) |
| `/admin/products/edit/:id` | GET/POST | Edit a product + its offers |
| `/admin/products/delete/:id` | POST | Delete a product (cascades offers + links) |
| `/admin/products/toggle/:id` | POST | Publish / unpublish a product |
| `/admin/products/feature/:id` | POST | Toggle featured |
| `/admin/carousel` | GET/POST | **Pick & order the 8 hero-carousel products** |
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
- Real affiliate links (seed data uses placeholder tagged URLs — replace via the admin product
  editor before going live).
- Image **uploads** (admin accepts image URLs; no runtime file storage — by design on Pages).
- Pagination on blog listings (the product catalogues ARE paginated: 20/page desktop, 16/page mobile).
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

**Last Updated**: 2026-06-24 (catalogue grid 5×4/2×8 + Flipkart-style Sort By everywhere +
clean category pages + animated Home nav icon + multi-message marquee + hero consistent
height/cover-fit/zoom + 3s autoplay + smaller dots)
