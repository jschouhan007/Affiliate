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
      `SELECT o.*, al.slug AS affiliate_slug, al.label
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

export async function getDealsByIds(db: D1Database, ids: number[]): Promise<Deal[]> {
  if (!ids.length) return []
  const safe = ids.filter((n) => Number.isInteger(n)).slice(0, 4)
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
