import type { Category, Deal, Post, Offer, Faq } from '../types'

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
