import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'
import { SITE } from './types'
import { Layout } from './views/layout'
import * as Pages from './views/pages'
import * as Q from './lib/queries'
import * as Schema from './lib/schema'
import {
  AFFILIATE_DISCLOSURE,
  PRIVACY_POLICY,
  TERMS,
  ABOUT,
  CONTACT,
} from './lib/staticContent'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))
app.get('/favicon.ico', (c) => c.redirect('/static/logo.svg', 301))

// Helper to render a full page
function page(c: any, opts: {
  title: string
  description?: string
  canonical?: string
  jsonLd?: string[]
  body: string
  categories: any[]
  noindex?: boolean
  status?: number
}) {
  const doc = Layout({
    title: opts.title,
    description: opts.description,
    canonical: opts.canonical,
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
  const [categories, featured, latestDeals, pillars, posts] = await Promise.all([
    Q.getCategories(db),
    Q.getDeals(db, { featured: true, limit: 8 }),
    Q.getDeals(db, { limit: 8 }),
    Q.getPosts(db, { pillar: true, limit: 3 }),
    Q.getPosts(db, { limit: 3 }),
  ])
  const body = Pages.HomePage({ categories, featured, latestDeals, pillars, posts })
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
    Q.getDeals(db, { limit: 60 }),
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
  const [deals, pillars] = await Promise.all([
    Q.getDeals(db, { categoryId: category.id, limit: 60 }),
    Q.getPosts(db, { categoryId: category.id, pillar: true, limit: 3 }),
  ])
  const body = Pages.CategoryPage({ category, deals, pillars })
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
    Q.getRelatedDeals(db, deal.category_id, deal.id, 4),
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
// BLOG
// ============================================================
app.get('/blog', async (c) => {
  const db = c.env.DB
  const [categories, posts] = await Promise.all([
    Q.getCategories(db),
    Q.getPosts(db, { limit: 40 }),
  ])
  const body = Pages.BlogIndexPage({
    posts,
    title: 'The Blog',
    subtitle: 'Tips, comparisons, how-tos and deal news.',
    crumbs: [{ name: 'Home', url: '/' }, { name: 'Blog' }],
  })
  return page(c, {
    title: 'Blog',
    description: 'Buying tips, product comparisons and how-tos to help you shop smarter.',
    canonical: '/blog',
    jsonLd: [Schema.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog' }])],
    body,
    categories,
  })
})

// GUIDES (pillar pages list)
app.get('/guides', async (c) => {
  const db = c.env.DB
  const [categories, posts] = await Promise.all([
    Q.getCategories(db),
    Q.getPosts(db, { pillar: true, limit: 40 }),
  ])
  const body = Pages.BlogIndexPage({
    posts,
    title: 'Buying Guides',
    subtitle: 'In-depth "best of" roundups that compare your best options.',
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
      { name: post.pillar ? 'Guides' : 'Blog', url: post.pillar ? '/guides' : '/blog' },
      { name: post.title, url: sourcePath },
    ]),
  ]
  if (faqs.length) jsonLd.push(Schema.faqSchema(faqs))
  if (deals.length) jsonLd.push(Schema.itemListSchema(deals, sourcePath))
  return page(c, {
    title: post.title,
    description: post.excerpt || post.title,
    canonical: sourcePath,
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
  if (q) {
    const res = await Q.searchAll(db, q)
    deals = res.deals
    posts = res.posts
  }
  const body = Pages.SearchPage({ q, deals, posts })
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

  // Log click (don't block redirect on failure)
  c.executionCtx.waitUntil(
    db
      .prepare(
        `INSERT INTO clicks (affiliate_link_id, link_slug, source_path, retailer, user_agent, country)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(link.id, slug, from, link.retailer, ua, country)
      .run()
      .catch(() => {})
  )

  // 302 so retailers/affiliate networks see the click fresh each time
  return c.redirect(link.dest_url, 302)
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
// SITEMAP + ROBOTS + RSS
// ============================================================
app.get('/robots.txt', (c) => {
  return c.text(
    `User-agent: *\nAllow: /\nDisallow: /go/\nDisallow: /search\nDisallow: /api/\n\nSitemap: ${SITE.url}/sitemap.xml\n`,
    200,
    { 'Content-Type': 'text/plain' }
  )
})

app.get('/sitemap.xml', async (c) => {
  const db = c.env.DB
  const [categories, deals, posts] = await Promise.all([
    Q.getCategories(db),
    Q.getDeals(db, { limit: 1000 }),
    Q.getPosts(db, { limit: 1000 }),
  ])
  const staticUrls = ['', '/deals', '/blog', '/guides', '/about', '/contact', '/affiliate-disclosure', '/privacy-policy', '/terms-of-service']
  const urls: { loc: string; lastmod?: string; priority: string }[] = []
  for (const s of staticUrls) urls.push({ loc: SITE.url + s, priority: s === '' ? '1.0' : '0.7' })
  for (const cat of categories) urls.push({ loc: `${SITE.url}/category/${cat.slug}`, priority: '0.8' })
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
