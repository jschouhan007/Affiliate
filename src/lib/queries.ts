import type { Category, Deal, Post, Offer, Faq, Hub } from '../types'

export async function getCategories(db: D1Database): Promise<Category[]> {
  const { results } = await db
    .prepare('SELECT * FROM categories ORDER BY sort_order, name')
    .all<Category>()
  return results || []
}

export async function getCategoryBySlug(
  db: D1Database,
  slug: string
): Promise<Category | null> {
  return await db
    .prepare('SELECT * FROM categories WHERE slug = ?')
    .bind(slug)
    .first<Category>()
}

export async function getOffersForDeal(
  db: D1Database,
  dealId: number
): Promise<Offer[]> {
  const { results } = await db
    .prepare(
      `SELECT o.*, al.slug AS affiliate_slug, al.label, al.dest_url
       FROM offers o
       LEFT JOIN affiliate_links al ON al.id = o.affiliate_link_id
       WHERE o.deal_id = ?
       ORDER BY o.price ASC`
    )
    .bind(dealId)
    .all<Offer>()
  return results || []
}

const DEAL_SELECT = `
  SELECT d.*, c.slug AS category_slug, c.name AS category_name
  FROM deals d
  LEFT JOIN categories c ON c.id = d.category_id
`

export async function getDeals(
  db: D1Database,
  opts: { categoryId?: number; featured?: boolean; limit?: number; offset?: number } = {}
): Promise<Deal[]> {
  let sql = DEAL_SELECT + ' WHERE d.published = 1'
  const binds: unknown[] = []
  if (opts.categoryId) {
    sql += ' AND d.category_id = ?'
    binds.push(opts.categoryId)
  }
  if (opts.featured) sql += ' AND d.featured = 1'
  sql += ' ORDER BY d.featured DESC, d.updated_at DESC'
  if (opts.limit) {
    sql += ' LIMIT ?'
    binds.push(opts.limit)
    if (opts.offset) {
      sql += ' OFFSET ?'
      binds.push(opts.offset)
    }
  }
  const { results } = await db.prepare(sql).bind(...binds).all<Deal>()
  const deals = results || []
  for (const d of deals) d.offers = await getOffersForDeal(db, d.id)
  return deals
}

// Full published catalogue for the homepage product grid. Fashion-first
// (this is a fashion-prioritised niche), then featured, then newest. Capped at
// a sane number so the client-side paginated grid stays fast.
export async function getCatalogueDeals(db: D1Database, limit = 180): Promise<Deal[]> {
  const sql =
    DEAL_SELECT +
    ` WHERE d.published = 1
      ORDER BY (CASE WHEN c.slug = 'fashion' THEN 0 ELSE 1 END) ASC,
               d.featured DESC, d.updated_at DESC
      LIMIT ?`
  const { results } = await db.prepare(sql).bind(limit).all<Deal>()
  const deals = results || []
  for (const d of deals) d.offers = await getOffersForDeal(db, d.id)
  return deals
}

export async function getDealBySlug(
  db: D1Database,
  slug: string
): Promise<Deal | null> {
  const deal = await db
    .prepare(DEAL_SELECT + ' WHERE d.slug = ?')
    .bind(slug)
    .first<Deal>()
  if (deal) deal.offers = await getOffersForDeal(db, deal.id)
  return deal
}

const POST_SELECT = `
  SELECT p.*, c.slug AS category_slug, c.name AS category_name
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id
`

export async function getPosts(
  db: D1Database,
  opts: { categoryId?: number; pillar?: boolean; limit?: number; offset?: number } = {}
): Promise<Post[]> {
  let sql = POST_SELECT + ' WHERE p.published = 1'
  const binds: unknown[] = []
  if (opts.categoryId) {
    sql += ' AND p.category_id = ?'
    binds.push(opts.categoryId)
  }
  if (opts.pillar) sql += ' AND p.pillar = 1'
  sql += ' ORDER BY p.published_at DESC'
  if (opts.limit) {
    sql += ' LIMIT ?'
    binds.push(opts.limit)
    if (opts.offset) {
      sql += ' OFFSET ?'
      binds.push(opts.offset)
    }
  }
  const { results } = await db.prepare(sql).bind(...binds).all<Post>()
  return results || []
}

export async function getPostBySlug(
  db: D1Database,
  slug: string
): Promise<Post | null> {
  return await db
    .prepare(POST_SELECT + ' WHERE p.slug = ?')
    .bind(slug)
    .first<Post>()
}

export async function getDealsForPost(
  db: D1Database,
  postId: number
): Promise<Deal[]> {
  const { results } = await db
    .prepare(
      `SELECT d.*, c.slug AS category_slug, c.name AS category_name, pd.sort_order
       FROM post_deals pd
       JOIN deals d ON d.id = pd.deal_id
       LEFT JOIN categories c ON c.id = d.category_id
       WHERE pd.post_id = ? AND d.published = 1
       ORDER BY pd.sort_order`
    )
    .bind(postId)
    .all<Deal>()
  const deals = results || []
  for (const d of deals) d.offers = await getOffersForDeal(db, d.id)
  return deals
}

export async function getFaqs(
  db: D1Database,
  parentType: 'post' | 'deal',
  parentId: number
): Promise<Faq[]> {
  const { results } = await db
    .prepare(
      'SELECT * FROM faqs WHERE parent_type = ? AND parent_id = ? ORDER BY sort_order'
    )
    .bind(parentType, parentId)
    .all<Faq>()
  return results || []
}

export async function searchAll(
  db: D1Database,
  q: string
): Promise<{ deals: Deal[]; posts: Post[] }> {
  const like = `%${q}%`
  const { results: deals } = await db
    .prepare(
      DEAL_SELECT +
        ' WHERE d.published = 1 AND (d.title LIKE ? OR d.brand LIKE ? OR d.short_desc LIKE ?) LIMIT 20'
    )
    .bind(like, like, like)
    .all<Deal>()
  const { results: posts } = await db
    .prepare(
      POST_SELECT +
        ' WHERE p.published = 1 AND (p.title LIKE ? OR p.excerpt LIKE ?) LIMIT 20'
    )
    .bind(like, like)
    .all<Post>()
  return { deals: deals || [], posts: posts || [] }
}

// ---- Hubs (hub-and-spoke) ----
export async function getHubs(db: D1Database): Promise<Hub[]> {
  const { results } = await db
    .prepare('SELECT * FROM hubs WHERE published = 1 ORDER BY updated_at DESC')
    .all<Hub>()
  return results || []
}

export async function getHubBySlug(db: D1Database, slug: string): Promise<Hub | null> {
  return await db.prepare('SELECT * FROM hubs WHERE slug = ? AND published = 1').bind(slug).first<Hub>()
}

// Resolve a hub's spoke deals programmatically from its rule.
export async function getHubDeals(db: D1Database, hub: Hub): Promise<Deal[]> {
  let deals: Deal[] = []
  if (hub.rule_type === 'manual') {
    const { results } = await db
      .prepare(
        `SELECT d.*, c.slug AS category_slug, c.name AS category_name, hd.note, hd.sort_order
         FROM hub_deals hd JOIN deals d ON d.id = hd.deal_id
         LEFT JOIN categories c ON c.id = d.category_id
         WHERE hd.hub_id = ? AND d.published = 1
         ORDER BY hd.sort_order`
      )
      .bind(hub.id)
      .all<Deal>()
    deals = results || []
  } else if (hub.rule_type === 'category' && hub.rule_value) {
    const cat = await getCategoryBySlug(db, hub.rule_value)
    if (cat) deals = await getDeals(db, { categoryId: cat.id, limit: 24 })
  } else if (hub.rule_type === 'feature' && hub.rule_value) {
    const { results } = await db
      .prepare(
        DEAL_SELECT + " WHERE d.published = 1 AND d.features LIKE ? ORDER BY d.featured DESC, d.rating DESC LIMIT 24"
      )
      .bind(`%${hub.rule_value}%`)
      .all<Deal>()
    deals = results || []
  } else if (hub.rule_type === 'price' && hub.rule_value) {
    // deals whose cheapest offer is <= rule_value
    const max = Number(hub.rule_value)
    const all = await getDeals(db, { limit: 200 })
    deals = all.filter((d) => {
      const cheapest = (d.offers || []).filter((o) => o.price != null).sort((a, b) => (a.price as number) - (b.price as number))[0]
      return cheapest && (cheapest.price as number) <= max
    })
  }
  for (const d of deals) if (!d.offers) d.offers = await getOffersForDeal(db, d.id)
  return deals
}

export async function getDealsByIds(db: D1Database, ids: number[], max = 4): Promise<Deal[]> {
  if (!ids.length) return []
  const safe = ids.filter((n) => Number.isInteger(n)).slice(0, max)
  if (!safe.length) return []
  const placeholders = safe.map(() => '?').join(',')
  const { results } = await db
    .prepare(DEAL_SELECT + ` WHERE d.published = 1 AND d.id IN (${placeholders})`)
    .bind(...safe)
    .all<Deal>()
  const deals = results || []
  for (const d of deals) d.offers = await getOffersForDeal(db, d.id)
  // preserve requested order
  return safe.map((id) => deals.find((d) => d.id === id)).filter(Boolean) as Deal[]
}

// ---- Site settings (key/value) ----
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first<{ value: string }>()
  return row ? row.value : null
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    )
    .bind(key, value)
    .run()
}

// Ordered list of product IDs chosen for the homepage hero carousel.
export async function getCarouselIds(db: D1Database): Promise<number[]> {
  const raw = await getSetting(db, 'hero_carousel')
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)).slice(0, 8) : []
  } catch {
    return []
  }
}

export async function setCarouselIds(db: D1Database, ids: number[]): Promise<void> {
  const clean = ids.filter((n) => Number.isInteger(n)).slice(0, 8)
  await setSetting(db, 'hero_carousel', JSON.stringify(clean))
}

// Resolve the carousel products. Falls back to featured (then latest) deals
// so the hero is never empty even before the admin has made a selection.
export async function getCarouselDeals(db: D1Database): Promise<Deal[]> {
  const ids = await getCarouselIds(db)
  let deals = ids.length ? await getDealsByIds(db, ids, 8) : []
  if (deals.length < 8) {
    const have = new Set(deals.map((d) => d.id))
    const fillers = await getDeals(db, { featured: true, limit: 8 })
    for (const d of fillers) {
      if (deals.length >= 8) break
      if (!have.has(d.id)) { deals.push(d); have.add(d.id) }
    }
    if (deals.length < 8) {
      const more = await getDeals(db, { limit: 12 })
      for (const d of more) {
        if (deals.length >= 8) break
        if (!have.has(d.id)) { deals.push(d); have.add(d.id) }
      }
    }
  }
  return deals.slice(0, 8)
}

// Admin: every product (published or draft), for the manager + carousel picker.
export async function getAllDealsAdmin(db: D1Database): Promise<Deal[]> {
  const { results } = await db
    .prepare(DEAL_SELECT + ' ORDER BY d.featured DESC, d.updated_at DESC, d.title ASC')
    .all<Deal>()
  const deals = results || []
  for (const d of deals) d.offers = await getOffersForDeal(db, d.id)
  return deals
}

// ---- Admin: product (Deal) + offer CRUD ----
export interface DealInput {
  slug: string
  title: string
  brand?: string
  category_id?: number | null
  image_url?: string
  short_desc?: string
  description?: string
  rating?: number | null
  rating_count?: number
  pros?: string
  cons?: string
  featured?: number
  published?: number
}

export interface OfferInput {
  retailer: string
  price?: number | null
  original_price?: number | null
  currency?: string
  in_stock?: number
  buy_url?: string // the real product/affiliate destination URL
  label?: string
}

export async function getDealById(db: D1Database, id: number): Promise<Deal | null> {
  const deal = await db.prepare(DEAL_SELECT + ' WHERE d.id = ?').bind(id).first<Deal>()
  if (deal) deal.offers = await getOffersForDeal(db, deal.id)
  return deal
}

export async function dealSlugExists(db: D1Database, slug: string, exceptId?: number): Promise<boolean> {
  const row = exceptId
    ? await db.prepare('SELECT id FROM deals WHERE slug = ? AND id != ?').bind(slug, exceptId).first<{ id: number }>()
    : await db.prepare('SELECT id FROM deals WHERE slug = ?').bind(slug).first<{ id: number }>()
  return !!row
}

export async function createDeal(db: D1Database, d: DealInput): Promise<number> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const res = await db
    .prepare(
      `INSERT INTO deals (slug, title, category_id, brand, image_url, short_desc, description, rating, rating_count, pros, cons, featured, published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      d.slug,
      d.title,
      d.category_id ?? null,
      d.brand || null,
      d.image_url || null,
      d.short_desc || null,
      d.description || null,
      d.rating ?? null,
      d.rating_count ?? 0,
      d.pros || null,
      d.cons || null,
      d.featured ? 1 : 0,
      d.published ? 1 : 0,
      now,
      now
    )
    .run()
  return res.meta.last_row_id as number
}

export async function updateDeal(db: D1Database, id: number, d: DealInput): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db
    .prepare(
      `UPDATE deals SET slug=?, title=?, category_id=?, brand=?, image_url=?, short_desc=?, description=?, rating=?, rating_count=?, pros=?, cons=?, featured=?, published=?, updated_at=?
       WHERE id=?`
    )
    .bind(
      d.slug,
      d.title,
      d.category_id ?? null,
      d.brand || null,
      d.image_url || null,
      d.short_desc || null,
      d.description || null,
      d.rating ?? null,
      d.rating_count ?? 0,
      d.pros || null,
      d.cons || null,
      d.featured ? 1 : 0,
      d.published ? 1 : 0,
      now,
      id
    )
    .run()
}

export async function deleteDeal(db: D1Database, id: number): Promise<void> {
  // Clean up related rows. Affiliate links tied only to this deal's offers are removed too.
  const { results } = await db.prepare('SELECT affiliate_link_id FROM offers WHERE deal_id = ?').bind(id).all<{ affiliate_link_id: number | null }>()
  await db.prepare('DELETE FROM offers WHERE deal_id = ?').bind(id).run()
  await db.prepare('DELETE FROM post_deals WHERE deal_id = ?').bind(id).run()
  await db.prepare('DELETE FROM hub_deals WHERE deal_id = ?').bind(id).run()
  await db.prepare('DELETE FROM deals WHERE id = ?').bind(id).run()
  for (const r of results || []) {
    if (r.affiliate_link_id) {
      const stillUsed = await db.prepare('SELECT id FROM offers WHERE affiliate_link_id = ? LIMIT 1').bind(r.affiliate_link_id).first()
      if (!stillUsed) await db.prepare('DELETE FROM affiliate_links WHERE id = ?').bind(r.affiliate_link_id).run()
    }
  }
}

export async function setDealPublished(db: D1Database, id: number, published: number): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db.prepare('UPDATE deals SET published = ?, updated_at = ? WHERE id = ?').bind(published ? 1 : 0, now, id).run()
}

export async function setDealFeatured(db: D1Database, id: number, featured: number): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db.prepare('UPDATE deals SET featured = ?, updated_at = ? WHERE id = ?').bind(featured ? 1 : 0, now, id).run()
}

// Replace ALL offers for a deal with the supplied list. Each offer carries its
// own buy URL, which we store as an affiliate_link (routed via /go/:slug) so the
// Buy Now buttons keep working and clicks stay trackable.
export async function replaceOffers(db: D1Database, dealId: number, dealSlug: string, offers: OfferInput[]): Promise<void> {
  // Remove existing offers + their dedicated affiliate links
  const { results: existing } = await db.prepare('SELECT affiliate_link_id FROM offers WHERE deal_id = ?').bind(dealId).all<{ affiliate_link_id: number | null }>()
  await db.prepare('DELETE FROM offers WHERE deal_id = ?').bind(dealId).run()
  for (const r of existing || []) {
    if (r.affiliate_link_id) {
      const stillUsed = await db.prepare('SELECT id FROM offers WHERE affiliate_link_id = ? LIMIT 1').bind(r.affiliate_link_id).first()
      if (!stillUsed) await db.prepare('DELETE FROM affiliate_links WHERE id = ?').bind(r.affiliate_link_id).run()
    }
  }
  let idx = 0
  for (const o of offers) {
    idx++
    const retailer = (o.retailer || 'other').trim().toLowerCase()
    if (!o.buy_url && o.price == null) continue // skip empty rows
    let linkId: number | null = null
    if (o.buy_url) {
      // unique slug per offer
      let base = `${dealSlug}-${retailer}`.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      let slug = base
      let n = 2
      while (await db.prepare('SELECT id FROM affiliate_links WHERE slug = ?').bind(slug).first()) {
        slug = `${base}-${n++}`
      }
      const res = await db
        .prepare('INSERT INTO affiliate_links (slug, retailer, dest_url, label, active) VALUES (?,?,?,?,1)')
        .bind(slug, retailer, o.buy_url, o.label || `Buy on ${retailer}`)
        .run()
      linkId = res.meta.last_row_id as number
    }
    await db
      .prepare(
        `INSERT INTO offers (deal_id, retailer, affiliate_link_id, price, original_price, currency, in_stock, updated_at)
         VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`
      )
      .bind(
        dealId,
        retailer,
        linkId,
        o.price ?? null,
        o.original_price ?? null,
        o.currency || 'INR',
        o.in_stock ? 1 : 0
      )
      .run()
  }
}

// ---- Admin: post CRUD ----
export interface PostInput {
  slug: string
  title: string
  excerpt?: string
  dek?: string
  body: string
  cover_image?: string
  category_id?: number | null
  author?: string
  author_role?: string
  read_minutes?: number | null
  post_type?: string
  pillar?: number
  published?: number
  // SEO
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_image?: string
  canonical_url?: string
  noindex?: number
}

export async function getAllPostsAdmin(db: D1Database): Promise<Post[]> {
  const { results } = await db
    .prepare(POST_SELECT + ' ORDER BY p.updated_at DESC')
    .all<Post>()
  return results || []
}

export async function getPostById(db: D1Database, id: number): Promise<Post | null> {
  return await db.prepare(POST_SELECT + ' WHERE p.id = ?').bind(id).first<Post>()
}

export async function slugExists(db: D1Database, slug: string, exceptId?: number): Promise<boolean> {
  const row = exceptId
    ? await db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').bind(slug, exceptId).first<{ id: number }>()
    : await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first<{ id: number }>()
  return !!row
}

export async function createPost(db: D1Database, p: PostInput): Promise<number> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const res = await db
    .prepare(
      `INSERT INTO posts (slug, title, excerpt, dek, body, cover_image, category_id, author, author_role, read_minutes, post_type, pillar, published, meta_title, meta_description, meta_keywords, og_image, canonical_url, noindex, published_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      p.slug,
      p.title,
      p.excerpt || null,
      p.dek || null,
      p.body,
      p.cover_image || null,
      p.category_id ?? null,
      p.author || 'DealSpot Editorial',
      p.author_role || 'Editorial',
      p.read_minutes ?? null,
      p.post_type || 'blog',
      p.pillar ? 1 : 0,
      p.published ? 1 : 0,
      p.meta_title || null,
      p.meta_description || null,
      p.meta_keywords || null,
      p.og_image || null,
      p.canonical_url || null,
      p.noindex ? 1 : 0,
      now,
      now
    )
    .run()
  return res.meta.last_row_id as number
}

export async function updatePost(db: D1Database, id: number, p: PostInput): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db
    .prepare(
      `UPDATE posts SET slug=?, title=?, excerpt=?, dek=?, body=?, cover_image=?, category_id=?, author=?, author_role=?, read_minutes=?, post_type=?, pillar=?, published=?, meta_title=?, meta_description=?, meta_keywords=?, og_image=?, canonical_url=?, noindex=?, updated_at=?
       WHERE id=?`
    )
    .bind(
      p.slug,
      p.title,
      p.excerpt || null,
      p.dek || null,
      p.body,
      p.cover_image || null,
      p.category_id ?? null,
      p.author || 'DealSpot Editorial',
      p.author_role || 'Editorial',
      p.read_minutes ?? null,
      p.post_type || 'blog',
      p.pillar ? 1 : 0,
      p.published ? 1 : 0,
      p.meta_title || null,
      p.meta_description || null,
      p.meta_keywords || null,
      p.og_image || null,
      p.canonical_url || null,
      p.noindex ? 1 : 0,
      now,
      id
    )
    .run()
}

export async function deletePost(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM post_deals WHERE post_id = ?').bind(id).run()
  await db.prepare("DELETE FROM faqs WHERE parent_type='post' AND parent_id = ?").bind(id).run()
  await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run()
}

// Quick publish/unpublish toggle (dashboard one-click)
export async function setPostPublished(db: D1Database, id: number, published: number): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db.prepare('UPDATE posts SET published = ?, updated_at = ? WHERE id = ?').bind(published ? 1 : 0, now, id).run()
}

// Duplicate a post as an unpublished draft with a unique slug
export async function duplicatePost(db: D1Database, id: number): Promise<number | null> {
  const src = await getPostById(db, id)
  if (!src) return null
  let base = `${src.slug}-copy`
  let slug = base
  let n = 2
  while (await slugExists(db, slug)) { slug = `${base}-${n++}` }
  return await createPost(db, {
    slug,
    title: `${src.title} (copy)`,
    excerpt: src.excerpt,
    dek: src.dek,
    body: src.body,
    cover_image: src.cover_image,
    category_id: src.category_id ?? null,
    author: src.author,
    author_role: src.author_role,
    read_minutes: src.read_minutes ?? null,
    post_type: src.post_type,
    pillar: src.pillar,
    published: 0, // duplicates start as drafts
    meta_title: src.meta_title,
    meta_description: src.meta_description,
    meta_keywords: src.meta_keywords,
    og_image: src.og_image,
    canonical_url: src.canonical_url,
    noindex: src.noindex,
  })
}

export async function getRelatedDeals(
  db: D1Database,
  categoryId: number | undefined,
  excludeId: number,
  limit = 4
): Promise<Deal[]> {
  if (!categoryId) return []
  const { results } = await db
    .prepare(
      DEAL_SELECT +
        ' WHERE d.published = 1 AND d.category_id = ? AND d.id != ? ORDER BY d.updated_at DESC LIMIT ?'
    )
    .bind(categoryId, excludeId, limit)
    .all<Deal>()
  const deals = results || []
  for (const d of deals) d.offers = await getOffersForDeal(db, d.id)
  return deals
}
