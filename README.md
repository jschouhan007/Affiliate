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
    AggregateRating + **Review (star ratings for SERP)**, FAQPage, ItemList, **ItemPage**.
  - Canonical tags, unique titles/descriptions, Open Graph + Twitter cards per page.
  - Dynamic `sitemap.xml` (auto-includes all deals/posts/categories/**hubs**).
  - `robots.txt` (disallows `/go/`, `/search`, `/api/`, `/compare`).
  - `rss.xml` feed for blog posts.

### Phase 6 — Affiliate-SEO, Performance & Deep Linking (Wave 11)
A focused pass on the high-impact affiliate-SEO / conversion levers, all edge-native.
- **SSR for crawlers** — every product, review, hub and article page is fully
  server-rendered by Hono (no client-side hydration needed for content), so Googlebot
  and AI crawlers get complete HTML on first byte. (No Next.js required — Hono SSR
  already satisfies this.)
- **Mobile deep linking** (`src/lib/outbound.ts` + rewritten `/go/:slug`) — the
  redirector detects the visitor's device from the User-Agent and, for **mobile users
  with a known retailer app**, serves a tiny `noindex` interstitial that opens the
  **native shopping app** to cut checkout friction, then auto-falls-back to the mobile
  web URL if the app isn't installed:
  - **Android** → `intent://…#Intent;scheme=https;package=<pkg>;S.browser_fallback_url=…;end`
    (the OS itself falls back to the browser). Packages: Amazon
    `com.amazon.mShop.android.shopping`, Flipkart `com.flipkart.android`, Myntra
    `com.myntra.android`.
  - **iOS** → retailer custom schemes (`com.amazon.mobile.shopping.web://`, `flipkart://`)
    tried first, with a JS timer falling back to the web URL.
  - **Desktop / unknown** → straight 302 to the tagged URL (unchanged behaviour).
- **Robust first-party tracking** (no third-party cookies):
  - `public/static/app.js` captures **UTM params on first touch** (`utm_source/medium/
    campaign/content/term` + landing path) into a first-party `ds_attr` cookie
    (`SameSite=Lax`, 30 days) **and** `localStorage`; first-touch wins.
  - UTM params are **preserved across internal navigation** via a capture-phase click
    listener that re-appends them to internal `<a>` hrefs (external / `#` / `/go/` /
    `mailto:` links are skipped).
  - On the outbound hop, `/go/:slug` **reads the `ds_attr` cookie server-side** and
    **appends the UTMs to the destination URL** (preserving the affiliate `tag=`), so
    attribution survives the jump to the retailer.
  - Each click is logged to D1 with **utm_source/medium/campaign/content/term,
    landing_path, device, and a deep_link flag** (migration `0009`), answering
    *"which article/campaign drove this affiliate click?"* from first-party data alone.
- **Strategic `rel` attributes** — **every** outbound affiliate link uses
  `rel="nofollow sponsored noopener"` (Google's required disclosure for paid/affiliate
  links); **internal links never carry `nofollow`** (only utility pages like `/search`,
  `/compare`, `/admin` are `noindex`), preserving internal link equity.
- **Dynamic canonicalization** — `page()` emits a **self-referencing
  `<link rel="canonical">` on every page pointing at the CLEAN URL** (query string like
  `?sort=`, `?utm_*`, and `#` fragments stripped, trailing slash normalised), preventing
  duplicate-content dilution from sort/tracking params.
- **Nested Schema markup (JSON-LD)** — review/money pages emit
  **Product + AggregateOffer + AggregateRating + Review**; articles emit
  **BlogPosting/Article + ImageObject + BreadcrumbList**; the comparison page emits a
  new **ItemPage → ItemList → Product[]** graph (`itemPageSchema`).
- **Edge caching + stale-while-revalidate** — a middleware sets
  `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400` on
  public GET HTML so Cloudflare's edge serves cached HTML with near-zero TTFB (great for
  crawl budget) while revalidating in the background; `/admin`, `/go/`, `/api/` are
  `no-store`; static assets get a long-lived immutable cache.
- **Image optimization** — all product `<img>` tags carry native
  **`loading="lazy"` + `decoding="async"`** (below-the-fold) or **`loading="eager"` +
  `fetchpriority="high"`** (LCP/hero images), with explicit **`width`/`height`** to
  eliminate CLS. *Note: Cloudflare Pages has no free runtime image-resize pipeline, so
  automatic WebP/AVIF transcoding/responsive resizing is not done at the edge here — it
  would require Cloudflare Images (paid) or pre-processing uploads. The lazy/eager +
  decoding + dimension hardening is implemented; format conversion is documented as a
  paid-tier upgrade path.*

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
- **Smart relevance search** (`/search?q=`) — the query is tokenised (stop-words stripped),
  expanded with a **synonym / related-word map** (e.g. *phone* → smartphone/mobile/iphone,
  *shoes* → sneaker/footwear, *earbuds* → tws/headphones) and singular/plural folds, then matched
  across **title, brand, category, features, short description and full description**. Results are
  **scored & ranked by relevance** (title > brand > category > features > description, with
  exact-phrase and quality boosts) so searching a category, feature or related word surfaces *all*
  relevant products — not just literal title matches.
- **Content-based recommendation engine** — `getRelatedDeals` scores every candidate against the
  seed product by **same category (strong), same brand, shared features, price proximity, and a
  rating/featured quality boost**, returning the most genuinely similar items. `getRecommendationsForDeals`
  aggregates the categories/brands of a whole result set to recommend popular adjacent products.
- **Similar-product recommendations on search** — every search shows a *"Similar products you may
  like"* strip below the results; when nothing matches it gracefully falls back to a *"Popular right
  now"* strip so the page is never a dead end.
- **Horizontal swipable recommendation strip** — on every product page (`/reviews/:slug`) a
  *"You may also like"* strip of up to 10 content-matched products sits below the review:
  scroll-snapping, native touch-swipe on mobile, **drag-to-scroll + prev/next arrow controls** on
  desktop (arrows auto-disable at the ends), with compact hover-zoom cards.
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
- **Entrance transition animation** — each slide animates in with a tasteful staggered
  fade + rise (media, then body, then CTA) via `is-active`/`is-entering` classes and CSS
  keyframes (`heroMediaIn`, `heroBodyIn`, `heroRiseIn`); subtle, not flashy, and fully
  disabled under `prefers-reduced-motion`.
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
- **Categories** (`/admin/categories`): a full **category-tree manager**. View the whole
  hierarchy as an indented tree table with **per-category usage counts** (deals / posts /
  child categories); **create** top-level or nested categories (parent picker + auto-slug),
  **inline edit** name/slug/parent/sort, and **delete** (deleting re-points its deals &
  posts to "uncategorised" and promotes its children to top-level so nothing is orphaned).
  Both the post editor and product editor now use a **hierarchical, indented category
  `<select>`** (parents bold, children indented) instead of a flat list, and the product
  editor's affiliate-URL field is relabelled "(direct product page URL)" for clarity.
- **Mega-menu** (header) — the category dropdown is rebuilt into a **clean, aligned
  layout**: parent categories become titled sections, each with a tidy column grid of
  their sub-categories, and stand-alone leaf categories sit in a separate leaf grid — no
  more cramped overlapping columns. A top-level **Footwear** category (with men/women/
  sports sub-categories and sneaker/formal/sandal/heel/flat leaf types) was added.
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
| `/admin/categories` | GET | **Category-tree manager** (list/usage counts) |
| `/admin/categories/new` | POST | Create a category (top-level or nested) |
| `/admin/categories/edit/:id` | POST | Edit a category (name/slug/parent/sort) |
| `/admin/categories/delete/:id` | POST | Delete (re-points deals/posts, promotes children) |
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
  - `categories` — hierarchical categories (self-referential `parent_id` for a tree;
    managed via `/admin/categories`).
  - `affiliate_links` — single source of truth for outbound URLs (swap a link site-wide
    in one place). Referenced via `/go/:slug`.
  - `deals` — products (the money items): title, brand, image, rating, pros/cons, markdown review.
  - `offers` — per-retailer price for a deal, tied to an `affiliate_link`.
  - `posts` — blog posts + pillar guides (markdown body).
  - `post_deals` — M:N link so a "best of" post lists multiple deals.
  - `faqs` — Q&A attached to a post or deal (powers FAQPage schema).
  - `clicks` — first-party affiliate click analytics, now incl. UTM source/medium/
    campaign/content/term, landing_path, device and a deep_link flag (migration `0009`).
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
  2. Apply migrations to prod: `npm run db:migrate:prod` (this applies **all** migrations
     `0001`–`0009`, including the category hierarchy, the Footwear category `0008`, and the
     click-attribution columns `0009`).
  3. Seed/insert your real content & real affiliate links.
  4. Update `SITE.url` in `src/types.ts` to your real domain.
  5. Deploy via the Cloudflare deploy flow (`npm run deploy`).

## Features Not Yet Implemented
- Real affiliate links (seed data uses placeholder tagged URLs — replace via the admin product
  editor before going live).
- Image **uploads** (admin accepts image URLs; no runtime file storage — by design on Pages).
- Pagination on blog listings (the product catalogues ARE paginated: 20/page desktop, 16/page mobile).
- Price-history tracking / automated price refresh.
- **Runtime WebP/AVIF transcoding & responsive `srcset` resizing** — not done at the edge
  (Cloudflare Pages has no free image-resize pipeline). Native lazy/eager loading,
  `decoding="async"`, `fetchpriority` and explicit dimensions ARE implemented; automatic
  format conversion is a paid upgrade path (Cloudflare Images or pre-processed uploads).
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

**Last Updated**: 2026-06-26 — **Wave 11 (affiliate-SEO / performance / deep-linking)**:
mobile deep linking (native Amazon/Flipkart/Myntra app open with web fallback, Android
`intent://` + iOS custom schemes via a noindex interstitial) + robust first-party UTM
tracking (first-touch `ds_attr` cookie + localStorage, preserved across internal nav,
appended to outbound dest, logged to D1 with device/deep_link via migration `0009`) +
`rel="nofollow sponsored noopener"` on all affiliate links (no nofollow on internal) +
dynamic self-referencing canonicalization (strips sort/UTM/hash) + nested JSON-LD
(Product/AggregateOffer/Review · BlogPosting/ImageObject/Breadcrumb · ItemPage/ItemList) +
edge caching with stale-while-revalidate + image lazy/eager + fetchpriority + decoding +
width/height (zero-CLS). · **Wave 9/10**: admin overhaul (hierarchical category selects in
post & product editors, full `/admin/categories` tree CRUD manager with usage counts) +
carousel 3s autoplay with staggered entrance animation + cleaned-up aligned mega-menu +
top-level Footwear category (migration `0008`). · Previously: left filter rail on all
catalogues & search + Sort/Filter on search + smart relevance search + content-based
recommendations + swipable "You may also like" strip + catalogue grid 5×4/2×8 + dark/light
themes.
