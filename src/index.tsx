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
  keywords?: string
  canonical?: string
  ogImage?: string
  jsonLd?: string[]
  body: string
  categories: any[]
  noindex?: boolean
  status?: number
}) {
  const doc = Layout({
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    canonical: opts.canonical,
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
  const [categories, featured, latestDeals, pillars, posts, hubs] = await Promise.all([
    Q.getCategories(db),
    Q.getDeals(db, { featured: true, limit: 8 }),
    Q.getDeals(db, { limit: 8 }),
    Q.getPosts(db, { pillar: true, limit: 3 }),
    Q.getPosts(db, { limit: 3 }),
    Q.getHubs(db),
  ])
  const body = Pages.HomePage({ categories, featured, latestDeals, pillars, posts, hubs })
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
  return page(c, {
    title: 'Compare Products',
    description: 'Compare products side by side — price, rating, specs and features.',
    canonical: '/compare',
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
// ADMIN — secure blog editor (password + signed cookie)
// ============================================================
async function requireAdmin(c: any): Promise<boolean> {
  const token = Auth.readCookie(c.req.header('cookie'))
  return await Auth.verifyToken(token, c.env)
}

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
