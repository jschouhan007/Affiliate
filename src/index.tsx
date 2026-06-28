import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'
import { SITE } from './types'
import { Layout } from './views/layout'
import * as Pages from './views/pages'
import * as Admin from './views/admin'
import * as Q from './lib/queries'
import * as Schema from './lib/schema'
import * as Auth from './lib/auth'
import * as Outbound from './lib/outbound'
import { getCookie } from 'hono/cookie'
import {
  AFFILIATE_DISCLOSURE,
  PRIVACY_POLICY,
  TERMS,
  ABOUT,
  CONTACT,
} from './lib/staticContent'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// ---- Edge caching + stale-while-revalidate -------------------------------
// Cache public HTML at Cloudflare's edge so crawlers (and users) get a
// millisecond TTFB, which preserves crawl budget. We use a short s-maxage with
// a long stale-while-revalidate window: the edge serves cached HTML instantly
// and refreshes it in the background, so content is never more than a few
// minutes stale while TTFB stays tiny. Personalised / mutating routes
// (admin, /go outbound, APIs, POSTs) are explicitly skipped and marked
// no-store. The static asset handler below sets its own long-lived caching.
app.use('*', async (c, next) => {
  await next()
  const p = c.req.path
  const isPublicGet =
    c.req.method === 'GET' &&
    !p.startsWith('/admin') &&
    !p.startsWith('/go/') &&
    !p.startsWith('/api/') &&
    !p.startsWith('/static/')
  // Only set caching when the handler hasn't already chosen a policy.
  if (!c.res.headers.get('Cache-Control')) {
    if (isPublicGet && c.res.status === 200) {
      // 5-min fresh at the edge, serve-stale-and-revalidate for 24h.
      c.res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400')
    } else if (p.startsWith('/admin') || p.startsWith('/go/') || p.startsWith('/api/')) {
      c.res.headers.set('Cache-Control', 'no-store')
    }
  }
})

// Static assets: hashed/long-lived. Cache hard at the edge + browser.
app.use('/static/*', async (c, next) => {
  await next()
  if (!c.res.headers.get('Cache-Control')) {
    c.res.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800')
  }
})
app.use('/static/*', serveStatic({ root: './public' }))
app.get('/favicon.ico', (c) => c.redirect('/static/logo.svg', 301))

// Helper to render a full page
function page(c: any, opts: {
  title: string
  description?: string
  keywords?: string
  canonical?: string
  ogImage?: string
  jsonLd?: string[]
  body: string
  categories: any[]
  noindex?: boolean
  status?: number
}) {
  // Dynamic canonicalization: always emit a self-referencing canonical pointing
  // at the CLEAN path (no ?sort=, ?utm_*, ?from=, pagination, etc.). If a route
  // doesn't pass one we derive it from the request path — and we defensively
  // strip any query string so tracking/sorting params can never split ranking
  // signals or create duplicate-content URLs.
  let canonical = opts.canonical ?? c.req.path
  if (canonical && !canonical.startsWith('http')) {
    canonical = canonical.split('?')[0].split('#')[0]
    if (canonical.length > 1) canonical = canonical.replace(/\/+$/, '') // no trailing slash (except root)
    if (!canonical) canonical = '/'
  }
  const doc = Layout({
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    canonical,
    ogImage: opts.ogImage,
    jsonLd: opts.jsonLd,
    categories: opts.categories,
    noindex: opts.noindex,
    children: opts.body,
  })
  if (opts.status) c.status(opts.status)
  return c.html(doc as any)
}

// ============================================================
// HOME
// ============================================================
app.get('/', async (c) => {
  const db = c.env.DB
  const [categories, featured, latestDeals, pillars, posts, hubs, carousel, catalogue] = await Promise.all([
    Q.getCategories(db),
    Q.getDeals(db, { featured: true, limit: 8 }),
    Q.getDeals(db, { limit: 8 }),
    Q.getPosts(db, { pillar: true, limit: 3 }),
    Q.getPosts(db, { limit: 3 }),
    Q.getHubs(db),
    Q.getCarouselDeals(db),
    Q.getCatalogueDeals(db),
  ])
  const body = Pages.HomePage({ categories, featured, latestDeals, pillars, posts, hubs, carousel, catalogue })
  return page(c, {
    title: SITE.name,
    canonical: '/',
    jsonLd: [Schema.organizationSchema(), Schema.websiteSchema()],
    body,
    categories,
  })
})

// ============================================================
// DEALS
// ============================================================
app.get('/deals', async (c) => {
  const db = c.env.DB
  const [categories, deals] = await Promise.all([
    Q.getCategories(db),
    Q.getDeals(db, { limit: 200 }),
  ])
  const body = Pages.DealsPage({
    deals,
    title: 'All Deals',
    subtitle: 'Every hand-picked, price-checked deal in one place.',
    crumbs: [{ name: 'Home', url: '/' }, { name: 'Deals' }],
  })
  return page(c, {
    title: 'All Deals',
    description: 'Browse all the best deals on mobiles, tech, appliances, home and outdoor gear from Amazon, Flipkart and more.',
    canonical: '/deals',
    jsonLd: [Schema.itemListSchema(deals, '/deals'), Schema.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Deals', url: '/deals' }])],
    body,
    categories,
  })
})

// ============================================================
// CATEGORY
// ============================================================
app.get('/category/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  const categories = await Q.getCategories(db)
  const category = await Q.getCategoryBySlug(db, slug)
  if (!category) return notFound(c, categories)
  // Include products from every descendant subcategory (e.g. Fashion shows
  // Men/Women and all their sub-subcategories), plus the children for sub-nav.
  const catIds = await Q.getDescendantCategoryIds(db, category.id)
  const [deals, pillars, children] = await Promise.all([
    Q.getDeals(db, { categoryIds: catIds, limit: 200 }),
    Q.getPosts(db, { categoryId: category.id, pillar: true, limit: 3 }),
    Q.getChildCategories(db, category.id),
  ])
  const body = Pages.CategoryPage({ category, deals, pillars, children })
  return page(c, {
    title: `${category.name} Deals`,
    description: category.description || `Best ${category.name} deals from Amazon, Flipkart & more.`,
    canonical: `/category/${slug}`,
    jsonLd: [
      Schema.itemListSchema(deals, `/category/${slug}`),
      Schema.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: category.name, url: `/category/${slug}` }]),
    ],
    body,
    categories,
  })
})

// ============================================================
// HUB INDEX + HUB (best-of collections)
// ============================================================
app.get('/best', async (c) => {
  const db = c.env.DB
  const [categories, hubs] = await Promise.all([Q.getCategories(db), Q.getHubs(db)])
  const body = Pages.HubIndexPage({ hubs })
  return page(c, {
    title: 'Best-Of Collections',
    description: 'Curated best-of shortlists across mobiles, tech, audio and home — our top-rated, best-value picks for every need.',
    canonical: '/best',
    jsonLd: [Schema.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Best Of', url: '/best' }])],
    body,
    categories,
  })
})

app.get('/best/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  const categories = await Q.getCategories(db)
  const hub = await Q.getHubBySlug(db, slug)
  if (!hub) return notFound(c, categories)
  const [deals, allHubs] = await Promise.all([Q.getHubDeals(db, hub), Q.getHubs(db)])
  const relatedHubs = allHubs.filter((h) => h.id !== hub.id).slice(0, 3)
  const sourcePath = `/best/${slug}`
  const body = Pages.HubPage({ hub, deals, relatedHubs, sourcePath })
  return page(c, {
    title: hub.title,
    description: hub.dek || `Our curated picks: ${hub.title}.`,
    canonical: sourcePath,
    jsonLd: [
      Schema.hubSchema(hub, deals),
      Schema.breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Best Of', url: '/best' },
        { name: hub.title, url: sourcePath },
      ]),
    ],
    body,
    categories,
  })
})

// ============================================================
// COMPARE
// ============================================================
app.get('/compare', async (c) => {
  const db = c.env.DB
  const categories = await Q.getCategories(db)
  const idsParam = (c.req.query('ids') || '').trim()
  const ids = idsParam
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 4)
  const deals = ids.length ? await Q.getDealsByIds(db, ids) : []
  const body = Pages.ComparePage({ deals, sourcePath: '/compare' })
  const jsonLd = deals.length
    ? [
        Schema.itemPageSchema(deals, '/compare', {
          name: 'Product comparison',
          description: 'Side-by-side comparison of products — price, rating, specs and features.',
        }),
      ]
    : []
  return page(c, {
    title: 'Compare Products',
    description: 'Compare products side by side — price, rating, specs and features.',
    canonical: '/compare',
    jsonLd,
    body,
    categories,
    noindex: true,
  })
})

// ============================================================
// REVIEW (money page)
// ============================================================
app.get('/reviews/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  const categories = await Q.getCategories(db)
  const deal = await Q.getDealBySlug(db, slug)
  if (!deal) return notFound(c, categories)
  const [faqs, related] = await Promise.all([
    Q.getFaqs(db, 'deal', deal.id),
    Q.getRelatedDeals(db, deal.category_id, deal.id, 10),
  ])
  const sourcePath = `/reviews/${slug}`
  const body = Pages.ReviewPage({ deal, faqs, related, sourcePath })
  const jsonLd = [
    Schema.productSchema(deal),
    Schema.breadcrumbSchema([
      { name: 'Home', url: '/' },
      ...(deal.category_name ? [{ name: deal.category_name, url: `/category/${deal.category_slug}` }] : []),
      { name: deal.title, url: sourcePath },
    ]),
  ]
  if (faqs.length) jsonLd.push(Schema.faqSchema(faqs))
  return page(c, {
    title: `${deal.title} — Review & Best Price`,
    description: deal.short_desc || `Honest review, pros & cons, and the best price for ${deal.title}.`,
    canonical: sourcePath,
    jsonLd,
    body,
    categories,
  })
})

// ============================================================
// BLOG — the standalone "Journal" page was removed. All posts now
// live under Buying Guides (/guides). Keep this 301 so old links,
// bookmarks and search-engine results don't break.
// ============================================================
app.get('/blog', (c) => c.redirect('/guides', 301))

// GUIDES — buying guides + all published articles (formerly "Journal")
app.get('/guides', async (c) => {
  const db = c.env.DB
  const [categories, posts] = await Promise.all([
    Q.getCategories(db),
    // Show every post (guides + articles) so anything published surfaces here.
    Q.getPosts(db, { limit: 60 }),
  ])
  const body = Pages.BlogIndexPage({
    posts,
    title: 'Buying Guides',
    subtitle: 'In-depth "best of" roundups and hands-on articles to help you choose well.',
    crumbs: [{ name: 'Home', url: '/' }, { name: 'Buying Guides' }],
  })
  return page(c, {
    title: 'Buying Guides',
    description: 'In-depth buying guides and "best of" roundups across every category.',
    canonical: '/guides',
    jsonLd: [Schema.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Buying Guides', url: '/guides' }])],
    body,
    categories,
  })
})

// SINGLE POST
app.get('/blog/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  const categories = await Q.getCategories(db)
  const post = await Q.getPostBySlug(db, slug)
  if (!post) return notFound(c, categories)
  const [faqs, deals, related] = await Promise.all([
    Q.getFaqs(db, 'post', post.id),
    Q.getDealsForPost(db, post.id),
    Q.getPosts(db, { categoryId: post.category_id, limit: 3 }),
  ])
  const sourcePath = `/blog/${slug}`
  const body = Pages.PostPage({
    post,
    faqs,
    deals,
    related: related.filter((p) => p.id !== post.id).slice(0, 2),
    sourcePath,
  })
  const jsonLd = [
    Schema.articleSchema(post),
    Schema.breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Buying Guides', url: '/guides' },
      { name: post.title, url: sourcePath },
    ]),
  ]
  if (faqs.length) jsonLd.push(Schema.faqSchema(faqs))
  if (deals.length) jsonLd.push(Schema.itemListSchema(deals, sourcePath))
  return page(c, {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || post.dek || post.title,
    keywords: post.meta_keywords || undefined,
    canonical: post.canonical_url || sourcePath,
    ogImage: post.og_image || post.cover_image || undefined,
    noindex: !post.published || !!post.noindex,
    jsonLd,
    body,
    categories,
  })
})

// ============================================================
// SEARCH
// ============================================================
app.get('/search', async (c) => {
  const db = c.env.DB
  const q = (c.req.query('q') || '').trim()
  const categories = await Q.getCategories(db)
  let deals: any[] = []
  let posts: any[] = []
  let recommended: any[] = []
  if (q) {
    const res = await Q.searchAll(db, q)
    deals = res.deals
    posts = res.posts
    // Similar-product recommendations based on the matched results (or, when
    // nothing matched, a popular fallback so the page is never a dead end).
    if (deals.length) {
      recommended = await Q.getRecommendationsForDeals(db, deals, 8)
    } else {
      recommended = await Q.getDeals(db, { featured: true, limit: 8 })
    }
  }
  const body = Pages.SearchPage({ q, deals, posts, recommended })
  return page(c, {
    title: q ? `Search: ${q}` : 'Search',
    description: `Search results for ${q}`,
    canonical: '/search',
    body,
    categories,
    noindex: true,
  })
})

// ============================================================
// AFFILIATE REDIRECT + CLICK LOGGING
// ============================================================
app.get('/go/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  const link = await db
    .prepare('SELECT * FROM affiliate_links WHERE slug = ? AND active = 1')
    .bind(slug)
    .first<any>()
  if (!link) return c.redirect('/', 302)

  const from = c.req.query('from') || c.req.header('referer') || ''
  const ua = c.req.header('user-agent') || ''
  const country = (c.req.raw as any).cf?.country || c.req.header('cf-ipcountry') || ''

  // ---- First-party attribution -------------------------------------------
  // Read the UTM/landing data app.js persisted in our first-party cookie on the
  // user's first visit, and append it to the destination so attribution
  // survives the outbound hop.
  const attr = Outbound.parseAttributionCookie(getCookie(c, 'ds_attr'))
  attr.from = from
  const destWithAttr = Outbound.appendAttribution(link.dest_url, attr)

  // ---- Mobile deep linking ------------------------------------------------
  const device = Outbound.detectDevice(ua)
  const retailer = Outbound.detectRetailer(destWithAttr, link.retailer)
  const { app: appLink, web, isAndroidIntent, intent } = Outbound.buildDeepLinks(destWithAttr, retailer, device)
  const useDeepLink = Outbound.isMobile(device) && !!appLink

  // Log click with attribution (never block the redirect on a logging failure)
  c.executionCtx.waitUntil(
    db
      .prepare(
        `INSERT INTO clicks (affiliate_link_id, link_slug, source_path, retailer, user_agent, country,
           utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_path, device, deep_link)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        link.id, slug, from, link.retailer, ua, country,
        attr.utm_source || null, attr.utm_medium || null, attr.utm_campaign || null,
        attr.utm_content || null, attr.utm_term || null, attr.landing || null,
        device, useDeepLink ? 1 : 0
      )
      .run()
      .catch(() => {})
  )

  // On mobile with a known app, serve a tiny interstitial that opens the native
  // app and falls back to the web URL — drastically cutting checkout friction.
  if (useDeepLink) {
    return c.html(
      Outbound.buildInterstitial(appLink, web, Outbound.retailerDisplayName(retailer), !!isAndroidIntent, intent),
      200,
      { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
    )
  }

  // Desktop / unknown: 302 straight through (retailers see a fresh click).
  return c.redirect(web, 302)
})

// ============================================================
// NEWSLETTER API
// ============================================================
app.post('/api/subscribe', async (c) => {
  const db = c.env.DB
  let email = ''
  let from = ''
  try {
    const ct = c.req.header('content-type') || ''
    if (ct.includes('application/json')) {
      const b = await c.req.json()
      email = (b.email || '').trim()
      from = b.from || ''
    } else {
      const b = await c.req.parseBody()
      email = String(b.email || '').trim()
      from = String(b.from || '')
    }
  } catch {
    return c.json({ ok: false, error: 'Invalid request' }, 400)
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return c.json({ ok: false, error: 'Please enter a valid email.' }, 400)
  }
  try {
    await db
      .prepare('INSERT OR IGNORE INTO subscribers (email, source_path) VALUES (?, ?)')
      .bind(email, from)
      .run()
    return c.json({ ok: true, message: 'You\'re subscribed! Watch your inbox for the best deals.' })
  } catch {
    return c.json({ ok: false, error: 'Something went wrong. Try again.' }, 500)
  }
})

// Website search typeahead (Amazon/Flipkart-style). Public, cached briefly.
app.get('/api/search-suggest', async (c) => {
  const q = c.req.query('q') || ''
  if (!q.trim()) return c.json({ suggestions: [] })
  try {
    const suggestions = await Q.getSearchSuggestions(c.env.DB, q, 8)
    c.header('Cache-Control', 'public, max-age=60, s-maxage=120')
    return c.json({ suggestions })
  } catch {
    return c.json({ suggestions: [] })
  }
})

// ============================================================
// LEGAL / STATIC PAGES
// ============================================================
const staticPages: Record<string, { title: string; md: string }> = {
  'affiliate-disclosure': { title: 'Affiliate Disclosure', md: AFFILIATE_DISCLOSURE },
  'privacy-policy': { title: 'Privacy Policy', md: PRIVACY_POLICY },
  'terms-of-service': { title: 'Terms of Service', md: TERMS },
  about: { title: `About ${SITE.name}`, md: ABOUT },
  contact: { title: 'Contact Us', md: CONTACT },
}
for (const [path, { title, md }] of Object.entries(staticPages)) {
  app.get('/' + path, async (c) => {
    const categories = await Q.getCategories(c.env.DB)
    const body = Pages.StaticPage({
      title,
      bodyMarkdown: md,
      crumbs: [{ name: 'Home', url: '/' }, { name: title }],
    })
    return page(c, {
      title,
      canonical: '/' + path,
      jsonLd: [Schema.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: title, url: '/' + path }])],
      body,
      categories,
    })
  })
}

// ============================================================
// ADMIN — secure blog editor (password + signed cookie)
// ============================================================
async function requireAdmin(c: any): Promise<boolean> {
  const token = Auth.readCookie(c.req.header('cookie'))
  return await Auth.verifyToken(token, c.env)
}

// Admin field autocomplete (brand, retailer, author, award, …). Auth-gated.
// Powers the <datalist> dropdowns so editors reuse existing values.
app.get('/admin/api/suggest', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ suggestions: [] }, 401)
  const field = c.req.query('field') || ''
  const q = c.req.query('q') || ''
  try {
    const suggestions = await Q.getFieldSuggestions(c.env.DB, field, q, 10)
    c.header('Cache-Control', 'no-store')
    return c.json({ suggestions })
  } catch {
    return c.json({ suggestions: [] })
  }
})

// Login screen
app.get('/admin/login', async (c) => {
  if (await requireAdmin(c)) return c.redirect('/admin', 302)
  return c.html(Admin.AdminLogin() as any)
})

app.post('/admin/login', async (c) => {
  const body = await c.req.parseBody()
  const password = String(body.password || '')
  if (!Auth.checkPassword(password, c.env)) {
    c.status(401)
    return c.html(Admin.AdminLogin({ error: 'Incorrect password. Try again.' }) as any)
  }
  const token = await Auth.createToken(c.env)
  c.header('Set-Cookie', Auth.cookieHeader(token))
  return c.redirect('/admin', 302)
})

app.post('/admin/logout', (c) => {
  c.header('Set-Cookie', Auth.clearCookieHeader())
  return c.redirect('/admin/login', 302)
})

// Dashboard
app.get('/admin', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const posts = await Q.getAllPostsAdmin(c.env.DB)
  const flash = c.req.query('flash') || undefined
  return c.html(Admin.AdminDashboard({ posts, flash }) as any)
})

// New post form
app.get('/admin/new', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const categories = await Q.getCategories(c.env.DB)
  return c.html(Admin.AdminEditor({ categories }) as any)
})

function parsePostBody(body: Record<string, any>): Q.PostInput {
  const slug = String(body.slug || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const rm = parseInt(String(body.read_minutes || ''), 10)
  const cat = parseInt(String(body.category_id || ''), 10)
  return {
    slug,
    title: String(body.title || '').trim(),
    excerpt: String(body.excerpt || '').trim(),
    dek: String(body.dek || '').trim(),
    body: String(body.body || ''),
    cover_image: String(body.cover_image || '').trim(),
    category_id: Number.isFinite(cat) ? cat : null,
    author: String(body.author || '').trim(),
    author_role: String(body.author_role || '').trim(),
    read_minutes: Number.isFinite(rm) ? rm : null,
    post_type: String(body.post_type || 'blog'),
    pillar: body.pillar ? 1 : 0,
    published: body.published ? 1 : 0,
    // SEO
    meta_title: String(body.meta_title || '').trim(),
    meta_description: String(body.meta_description || '').trim(),
    meta_keywords: String(body.meta_keywords || '').trim(),
    og_image: String(body.og_image || '').trim(),
    canonical_url: String(body.canonical_url || '').trim(),
    noindex: body.noindex ? 1 : 0,
  }
}

// Create post
app.post('/admin/new', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const categories = await Q.getCategories(c.env.DB)
  const input = parsePostBody(await c.req.parseBody())
  if (!input.title || !input.slug || !input.body) {
    c.status(400)
    return c.html(Admin.AdminEditor({ categories, error: 'Title, slug and body are required.' }) as any)
  }
  if (await Q.slugExists(c.env.DB, input.slug)) {
    c.status(400)
    return c.html(Admin.AdminEditor({ categories, error: `Slug "${input.slug}" already exists. Choose another.` }) as any)
  }
  await Q.createPost(c.env.DB, input)
  return c.redirect('/admin?flash=' + encodeURIComponent('Post created.'), 302)
})

// Edit post form
app.get('/admin/edit/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const [post, categories] = await Promise.all([Q.getPostById(c.env.DB, id), Q.getCategories(c.env.DB)])
  if (!post) return c.redirect('/admin?flash=' + encodeURIComponent('Post not found.'), 302)
  return c.html(Admin.AdminEditor({ post, categories }) as any)
})

// Update post
app.post('/admin/edit/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const categories = await Q.getCategories(c.env.DB)
  const post = await Q.getPostById(c.env.DB, id)
  if (!post) return c.redirect('/admin?flash=' + encodeURIComponent('Post not found.'), 302)
  const input = parsePostBody(await c.req.parseBody())
  if (!input.title || !input.slug || !input.body) {
    c.status(400)
    return c.html(Admin.AdminEditor({ post: { ...post, ...input } as any, categories, error: 'Title, slug and body are required.' }) as any)
  }
  if (await Q.slugExists(c.env.DB, input.slug, id)) {
    c.status(400)
    return c.html(Admin.AdminEditor({ post: { ...post, ...input } as any, categories, error: `Slug "${input.slug}" is already used by another post.` }) as any)
  }
  await Q.updatePost(c.env.DB, id, input)
  return c.redirect('/admin?flash=' + encodeURIComponent('Post updated.'), 302)
})

// Delete post
app.post('/admin/delete/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  await Q.deletePost(c.env.DB, id)
  return c.redirect('/admin?flash=' + encodeURIComponent('Post deleted.'), 302)
})

// Quick publish / unpublish toggle
app.post('/admin/toggle/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const post = await Q.getPostById(c.env.DB, id)
  if (!post) return c.redirect('/admin?flash=' + encodeURIComponent('Post not found.'), 302)
  await Q.setPostPublished(c.env.DB, id, post.published ? 0 : 1)
  return c.redirect('/admin?flash=' + encodeURIComponent(post.published ? 'Post unpublished (draft).' : 'Post published.'), 302)
})

// Duplicate post
app.post('/admin/duplicate/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const newId = await Q.duplicatePost(c.env.DB, id)
  if (!newId) return c.redirect('/admin?flash=' + encodeURIComponent('Could not duplicate post.'), 302)
  return c.redirect('/admin/edit/' + newId, 302)
})

// ============================================================
// ADMIN — products (Deals) + offers/buy links
// ============================================================
function slugify(s: string): string {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// With parseBody({ all: true }) any key MAY come back as an array. For
// single-value fields we always want the first scalar.
function first(v: any): string {
  if (Array.isArray(v)) return v.length ? String(v[0]) : ''
  return v == null ? '' : String(v)
}

function parseDealBody(body: Record<string, any>): Q.DealInput {
  const cat = parseInt(first(body.category_id), 10)
  const rating = parseFloat(first(body.rating))
  const rc = parseInt(first(body.rating_count), 10)
  return {
    slug: slugify(first(body.slug) || first(body.title)),
    title: first(body.title).trim(),
    brand: first(body.brand).trim(),
    category_id: Number.isFinite(cat) ? cat : null,
    image_url: first(body.image_url).trim(),
    short_desc: first(body.short_desc).trim(),
    description: first(body.description),
    rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : null,
    rating_count: Number.isFinite(rc) ? rc : 0,
    pros: first(body.pros).trim(),
    cons: first(body.cons).trim(),
    spec_summary: first(body.spec_summary).trim(),
    featured: body.featured ? 1 : 0,
    published: body.published ? 1 : 0,
  }
}

// parseBody returns arrays for repeated field names; normalise to arrays.
function asArray(v: any): any[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

function parseOffers(body: Record<string, any>): Q.OfferInput[] {
  const retailers = asArray(body.offer_retailer)
  const prices = asArray(body.offer_price)
  const originals = asArray(body.offer_original)
  const urls = asArray(body.offer_url)
  // checkboxes only submit when checked, so we can't index them positionally
  // reliably; default in_stock to 1 (sellable) unless price missing.
  const offers: Q.OfferInput[] = []
  const n = Math.max(retailers.length, prices.length, urls.length)
  for (let i = 0; i < n; i++) {
    const price = parseFloat(String(prices[i] || ''))
    const original = parseFloat(String(originals[i] || ''))
    const url = String(urls[i] || '').trim()
    if (!url && !Number.isFinite(price)) continue
    offers.push({
      retailer: String(retailers[i] || 'other').trim().toLowerCase(),
      price: Number.isFinite(price) ? price : null,
      original_price: Number.isFinite(original) ? original : null,
      currency: 'INR',
      in_stock: 1,
      buy_url: url || undefined,
    })
  }
  return offers
}

// Products list
app.get('/admin/products', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const deals = await Q.getAllDealsAdmin(c.env.DB)
  const flash = c.req.query('flash') || undefined
  return c.html(Admin.AdminProducts({ deals, flash }) as any)
})

// New product form
app.get('/admin/products/new', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const categories = await Q.getCategories(c.env.DB)
  return c.html(Admin.AdminProductEditor({ categories }) as any)
})

// Create product
app.post('/admin/products/new', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const categories = await Q.getCategories(c.env.DB)
  const raw = await c.req.parseBody({ all: true })
  const input = parseDealBody(raw)
  if (!input.title || !input.slug) {
    c.status(400)
    return c.html(Admin.AdminProductEditor({ categories, error: 'Product name and slug are required.' }) as any)
  }
  if (await Q.dealSlugExists(c.env.DB, input.slug)) {
    c.status(400)
    return c.html(Admin.AdminProductEditor({ categories, error: `Slug "${input.slug}" already exists. Choose another.` }) as any)
  }
  const id = await Q.createDeal(c.env.DB, input)
  await Q.replaceOffers(c.env.DB, id, input.slug, parseOffers(raw))
  return c.redirect('/admin/products?flash=' + encodeURIComponent('Product created.'), 302)
})

// Edit product form
app.get('/admin/products/edit/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const [deal, categories] = await Promise.all([Q.getDealById(c.env.DB, id), Q.getCategories(c.env.DB)])
  if (!deal) return c.redirect('/admin/products?flash=' + encodeURIComponent('Product not found.'), 302)
  return c.html(Admin.AdminProductEditor({ deal, categories }) as any)
})

// Update product
app.post('/admin/products/edit/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const categories = await Q.getCategories(c.env.DB)
  const deal = await Q.getDealById(c.env.DB, id)
  if (!deal) return c.redirect('/admin/products?flash=' + encodeURIComponent('Product not found.'), 302)
  const raw = await c.req.parseBody({ all: true })
  const input = parseDealBody(raw)
  if (!input.title || !input.slug) {
    c.status(400)
    return c.html(Admin.AdminProductEditor({ deal: { ...deal, ...input } as any, categories, error: 'Product name and slug are required.' }) as any)
  }
  if (await Q.dealSlugExists(c.env.DB, input.slug, id)) {
    c.status(400)
    return c.html(Admin.AdminProductEditor({ deal: { ...deal, ...input } as any, categories, error: `Slug "${input.slug}" is used by another product.` }) as any)
  }
  await Q.updateDeal(c.env.DB, id, input)
  await Q.replaceOffers(c.env.DB, id, input.slug, parseOffers(raw))
  return c.redirect('/admin/products?flash=' + encodeURIComponent('Product updated.'), 302)
})

// Delete product
app.post('/admin/products/delete/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  await Q.deleteDeal(c.env.DB, id)
  return c.redirect('/admin/products?flash=' + encodeURIComponent('Product deleted.'), 302)
})

// Toggle publish
app.post('/admin/products/toggle/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const deal = await Q.getDealById(c.env.DB, id)
  if (!deal) return c.redirect('/admin/products?flash=' + encodeURIComponent('Product not found.'), 302)
  await Q.setDealPublished(c.env.DB, id, deal.published ? 0 : 1)
  return c.redirect('/admin/products?flash=' + encodeURIComponent(deal.published ? 'Product hidden (draft).' : 'Product is now live.'), 302)
})

// Toggle featured
app.post('/admin/products/feature/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const deal = await Q.getDealById(c.env.DB, id)
  if (!deal) return c.redirect('/admin/products?flash=' + encodeURIComponent('Product not found.'), 302)
  await Q.setDealFeatured(c.env.DB, id, deal.featured ? 0 : 1)
  return c.redirect('/admin/products?flash=' + encodeURIComponent(deal.featured ? 'Removed from featured.' : 'Marked as featured.'), 302)
})

// ============================================================
// ADMIN — hero carousel selection
// ============================================================
app.get('/admin/carousel', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const [deals, selectedIds] = await Promise.all([Q.getAllDealsAdmin(c.env.DB), Q.getCarouselIds(c.env.DB)])
  const flash = c.req.query('flash') || undefined
  return c.html(Admin.AdminCarousel({ deals, selectedIds, flash }) as any)
})

app.post('/admin/carousel', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const body = await c.req.parseBody()
  const ids = String(body.ids || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n))
  await Q.setCarouselIds(c.env.DB, ids)
  return c.redirect('/admin/carousel?flash=' + encodeURIComponent(`Carousel saved — ${Math.min(ids.length, 8)} product(s).`), 302)
})

// ============================================================
// ADMIN — categories management
// ============================================================
async function buildCategoryRows(db: D1Database): Promise<Admin.AdminCategoryRow[]> {
  const all = await Q.getAllCategories(db)
  // Build ordered (root → sub → leaf) list with depth, then attach usage counts.
  const byParent = new Map<number | null, typeof all>()
  for (const c of all) {
    const key = (c.parent_id ?? null) as number | null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(c)
  }
  const ordered: { c: (typeof all)[number]; depth: number }[] = []
  const walk = (parent: number | null, depth: number) => {
    for (const c of byParent.get(parent) || []) {
      ordered.push({ c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  if (!ordered.length) for (const c of all) ordered.push({ c, depth: 0 })
  const rows: Admin.AdminCategoryRow[] = []
  for (const { c, depth } of ordered) {
    const usage = await Q.getCategoryUsage(db, c.id)
    rows.push({
      id: c.id,
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      parent_id: c.parent_id ?? null,
      sort_order: (c as any).sort_order ?? 0,
      deals: usage.deals,
      posts: usage.posts,
      depth,
    })
  }
  return rows
}

function slugifyCat(s: string): string {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

app.get('/admin/categories', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const rows = await buildCategoryRows(c.env.DB)
  const flash = c.req.query('flash') || undefined
  const error = c.req.query('error') || undefined
  const editId = c.req.query('edit') ? parseInt(c.req.query('edit')!, 10) : undefined
  return c.html(Admin.AdminCategories({ rows, flash, error, editId }) as any)
})

app.post('/admin/categories/new', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const b = await c.req.parseBody()
  const name = String(b.name || '').trim()
  const slug = slugifyCat(String(b.slug || name))
  if (!name || !slug) return c.redirect('/admin/categories?error=' + encodeURIComponent('Name and slug are required.'), 302)
  if (await Q.categorySlugExists(c.env.DB, slug)) return c.redirect('/admin/categories?error=' + encodeURIComponent(`Slug "${slug}" already exists.`), 302)
  const parent_id = b.parent_id ? parseInt(String(b.parent_id), 10) : null
  await Q.createCategory(c.env.DB, {
    name,
    slug,
    icon: String(b.icon || '').trim() || null,
    parent_id: Number.isInteger(parent_id) ? parent_id : null,
    sort_order: parseInt(String(b.sort_order || '0'), 10) || 0,
  })
  return c.redirect('/admin/categories?flash=' + encodeURIComponent(`Category "${name}" added.`), 302)
})

app.post('/admin/categories/edit/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const cat = await Q.getCategoryById(c.env.DB, id)
  if (!cat) return c.redirect('/admin/categories?error=' + encodeURIComponent('Category not found.'), 302)
  const b = await c.req.parseBody()
  const name = String(b.name || '').trim()
  const slug = slugifyCat(String(b.slug || name))
  if (!name || !slug) return c.redirect('/admin/categories?error=' + encodeURIComponent('Name and slug are required.'), 302)
  if (await Q.categorySlugExists(c.env.DB, slug, id)) return c.redirect('/admin/categories?error=' + encodeURIComponent(`Slug "${slug}" is used by another category.`), 302)
  let parent_id = b.parent_id ? parseInt(String(b.parent_id), 10) : null
  if (parent_id === id) parent_id = null // can't be its own parent
  await Q.updateCategory(c.env.DB, id, {
    name,
    slug,
    icon: String(b.icon || '').trim() || null,
    parent_id: Number.isInteger(parent_id as number) ? parent_id : null,
    sort_order: parseInt(String(b.sort_order || '0'), 10) || 0,
  })
  return c.redirect('/admin/categories?flash=' + encodeURIComponent(`Category "${name}" updated.`), 302)
})

app.post('/admin/categories/delete/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.redirect('/admin/login', 302)
  const id = parseInt(c.req.param('id'), 10)
  const cat = await Q.getCategoryById(c.env.DB, id)
  if (!cat) return c.redirect('/admin/categories?error=' + encodeURIComponent('Category not found.'), 302)
  await Q.deleteCategory(c.env.DB, id)
  return c.redirect('/admin/categories?flash=' + encodeURIComponent(`Category "${cat.name}" deleted.`), 302)
})

// ============================================================
// SITEMAP + ROBOTS + RSS
// ============================================================
app.get('/robots.txt', (c) => {
  return c.text(
    `User-agent: *\nAllow: /\nDisallow: /go/\nDisallow: /search\nDisallow: /api/\nDisallow: /admin\nDisallow: /compare\n\nSitemap: ${SITE.url}/sitemap.xml\n`,
    200,
    { 'Content-Type': 'text/plain' }
  )
})

app.get('/sitemap.xml', async (c) => {
  const db = c.env.DB
  const [categories, deals, posts, hubs] = await Promise.all([
    Q.getCategories(db),
    Q.getDeals(db, { limit: 1000 }),
    Q.getPosts(db, { limit: 1000 }),
    Q.getHubs(db),
  ])
  const staticUrls = ['', '/deals', '/best', '/guides', '/about', '/contact', '/affiliate-disclosure', '/privacy-policy', '/terms-of-service']
  const urls: { loc: string; lastmod?: string; priority: string }[] = []
  for (const s of staticUrls) urls.push({ loc: SITE.url + s, priority: s === '' ? '1.0' : '0.7' })
  for (const cat of categories) urls.push({ loc: `${SITE.url}/category/${cat.slug}`, priority: '0.8' })
  for (const h of hubs) urls.push({ loc: `${SITE.url}/best/${h.slug}`, lastmod: h.updated_at, priority: '0.9' })
  for (const d of deals) urls.push({ loc: `${SITE.url}/reviews/${d.slug}`, lastmod: d.updated_at, priority: '0.8' })
  for (const p of posts) urls.push({ loc: `${SITE.url}/blog/${p.slug}`, lastmod: p.updated_at, priority: p.pillar ? '0.9' : '0.6' })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod.replace(' ', 'T') + 'Z').toISOString().slice(0, 10)}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`
  return c.body(xml, 200, { 'Content-Type': 'application/xml' })
})

app.get('/rss.xml', async (c) => {
  const db = c.env.DB
  const posts = await Q.getPosts(db, { limit: 30 })
  const items = posts
    .map(
      (p) => `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${SITE.url}/blog/${p.slug}</link>
    <guid>${SITE.url}/blog/${p.slug}</guid>
    <pubDate>${new Date(p.published_at.replace(' ', 'T') + 'Z').toUTCString()}</pubDate>
    <description>${escapeXml(p.excerpt || '')}</description>
  </item>`
    )
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${SITE.name}</title>
  <link>${SITE.url}</link>
  <description>${escapeXml(SITE.description)}</description>
${items}
</channel></rss>`
  return c.body(xml, 200, { 'Content-Type': 'application/rss+xml' })
})

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch] as string))
}

// ============================================================
// 404
// ============================================================
function notFound(c: any, categories: any[]) {
  return page(c, {
    title: 'Page Not Found',
    body: Pages.NotFoundPage(),
    categories,
    noindex: true,
    status: 404,
  })
}

app.notFound(async (c) => {
  const categories = await Q.getCategories(c.env.DB).catch(() => [])
  return notFound(c, categories)
})

export default app
