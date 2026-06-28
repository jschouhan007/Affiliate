import type { Category, Deal, Post, Offer, Faq, Hub } from '../types'

// All categories (flat), ordered. Includes nested ones.
export async function getAllCategories(db: D1Database): Promise<Category[]> {
  const { results } = await db
    .prepare('SELECT * FROM categories ORDER BY sort_order, name')
    .all<Category>()
  return results || []
}

// Top-level categories (parent_id IS NULL), each with its `children` (and
// grandchildren) attached, ordered. Used everywhere (nav, footer, ribbon) so
// the mega-menu can render Fashion's subcategories without extra queries.
export async function getCategories(db: D1Database): Promise<Category[]> {
  return await getCategoryTree(db)
}

// Top-level categories with their nested children attached (a tree). Used for
// the mega-menu / category ribbon and the filter's category facet.
export async function getCategoryTree(db: D1Database): Promise<Category[]> {
  const all = await getAllCategories(db)
  const byId = new Map<number, Category>()
  for (const c of all) { c.children = []; byId.set(c.id, c) }
  const roots: Category[] = []
  for (const c of all) {
    if (c.parent_id != null && byId.has(c.parent_id)) byId.get(c.parent_id)!.children!.push(c)
    else roots.push(c)
  }
  return roots
}

// Direct children of a category.
export async function getChildCategories(db: D1Database, parentId: number): Promise<Category[]> {
  const { results } = await db
    .prepare('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order, name')
    .bind(parentId)
    .all<Category>()
  return results || []
}

// All descendant category IDs (self + children + grandchildren). Used so that
// browsing "Fashion" shows products from Men/Women and all their subcategories.
export async function getDescendantCategoryIds(db: D1Database, rootId: number): Promise<number[]> {
  const all = await getAllCategories(db)
  const childrenOf = new Map<number, number[]>()
  for (const c of all) {
    if (c.parent_id != null) {
      if (!childrenOf.has(c.parent_id)) childrenOf.set(c.parent_id, [])
      childrenOf.get(c.parent_id)!.push(c.id)
    }
  }
  const out: number[] = []
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    out.push(id)
    const kids = childrenOf.get(id)
    if (kids) for (const k of kids) stack.push(k)
  }
  return out
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

export async function getCategoryById(db: D1Database, id: number): Promise<Category | null> {
  return await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Category>()
}

export async function categorySlugExists(db: D1Database, slug: string, exceptId?: number): Promise<boolean> {
  const row = exceptId
    ? await db.prepare('SELECT 1 FROM categories WHERE slug = ? AND id != ?').bind(slug, exceptId).first()
    : await db.prepare('SELECT 1 FROM categories WHERE slug = ?').bind(slug).first()
  return !!row
}

// How many products + posts reference a category (used before delete).
export async function getCategoryUsage(db: D1Database, id: number): Promise<{ deals: number; posts: number; children: number }> {
  const deals = (await db.prepare('SELECT COUNT(*) AS n FROM deals WHERE category_id = ?').bind(id).first<{ n: number }>())?.n || 0
  const posts = (await db.prepare('SELECT COUNT(*) AS n FROM posts WHERE category_id = ?').bind(id).first<{ n: number }>())?.n || 0
  const children = (await db.prepare('SELECT COUNT(*) AS n FROM categories WHERE parent_id = ?').bind(id).first<{ n: number }>())?.n || 0
  return { deals, posts, children }
}

export interface CategoryInput {
  slug: string
  name: string
  icon?: string | null
  description?: string | null
  parent_id?: number | null
  sort_order?: number
}

export async function createCategory(db: D1Database, c: CategoryInput): Promise<number> {
  const res = await db
    .prepare('INSERT INTO categories (slug, name, icon, description, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(c.slug, c.name, c.icon || null, c.description || null, c.parent_id ?? null, c.sort_order ?? 0)
    .run()
  return res.meta.last_row_id as number
}

export async function updateCategory(db: D1Database, id: number, c: CategoryInput): Promise<void> {
  await db
    .prepare('UPDATE categories SET slug = ?, name = ?, icon = ?, description = ?, parent_id = ?, sort_order = ? WHERE id = ?')
    .bind(c.slug, c.name, c.icon || null, c.description || null, c.parent_id ?? null, c.sort_order ?? 0, id)
    .run()
}

// Delete a category. Re-points its products & posts to NULL (uncategorised) and
// promotes any direct children to top-level so nothing is orphaned by the FK.
export async function deleteCategory(db: D1Database, id: number): Promise<void> {
  await db.prepare('UPDATE deals SET category_id = NULL WHERE category_id = ?').bind(id).run()
  await db.prepare('UPDATE posts SET category_id = NULL WHERE category_id = ?').bind(id).run()
  await db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').bind(id).run()
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
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
  opts: { categoryId?: number; categoryIds?: number[]; featured?: boolean; limit?: number; offset?: number } = {}
): Promise<Deal[]> {
  let sql = DEAL_SELECT + ' WHERE d.published = 1'
  const binds: unknown[] = []
  if (opts.categoryIds && opts.categoryIds.length) {
    sql += ` AND d.category_id IN (${opts.categoryIds.map(() => '?').join(',')})`
    binds.push(...opts.categoryIds)
  } else if (opts.categoryId) {
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

// ---- Search helpers -------------------------------------------------------
// Lightweight English stop-words + a small synonym/related-word map so that a
// search for one word also surfaces obviously-related products (e.g. "phone"
// also matches "smartphone"/"mobile"; "shoe" matches "sneaker"/"footwear").
const SEARCH_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'to', 'in', 'on', 'at',
  'best', 'top', 'cheap', 'buy', 'price', 'deal', 'deals', 'review', 'reviews',
  'good', 'new', 'my', 'me', 'is', 'are', 'this', 'that',
])

const SEARCH_SYNONYMS: Record<string, string[]> = {
  phone: ['smartphone', 'mobile', 'iphone', 'android', 'cellphone'],
  smartphone: ['phone', 'mobile', 'iphone', 'android'],
  mobile: ['phone', 'smartphone', 'cellphone'],
  laptop: ['notebook', 'macbook', 'ultrabook', 'chromebook'],
  notebook: ['laptop', 'ultrabook'],
  tv: ['television', 'smarttv'],
  television: ['tv'],
  earphone: ['earphones', 'earbuds', 'headphone', 'headphones', 'tws', 'airpods'],
  earbuds: ['earphones', 'headphones', 'tws', 'airpods', 'earphone'],
  headphone: ['headphones', 'earphones', 'earbuds'],
  shoe: ['shoes', 'sneaker', 'sneakers', 'footwear', 'trainers'],
  shoes: ['shoe', 'sneaker', 'sneakers', 'footwear'],
  sneaker: ['sneakers', 'shoe', 'shoes', 'footwear', 'trainers'],
  watch: ['watches', 'smartwatch', 'wristwatch'],
  smartwatch: ['watch', 'watches', 'wearable'],
  tshirt: ['t-shirt', 'tee', 'shirt', 'top'],
  shirt: ['shirts', 'tshirt', 't-shirt', 'tee', 'top'],
  jeans: ['denim', 'pants', 'trousers'],
  bag: ['bags', 'backpack', 'handbag', 'tote'],
  backpack: ['bag', 'rucksack', 'bags'],
  jacket: ['jackets', 'coat', 'outerwear'],
  dress: ['dresses', 'gown', 'frock'],
  camera: ['cameras', 'dslr', 'mirrorless'],
  speaker: ['speakers', 'soundbar', 'bluetooth'],
  perfume: ['fragrance', 'cologne', 'scent'],
  fragrance: ['perfume', 'cologne', 'scent'],
}

// Split a query into useful lowercased tokens, expanding via the synonym map.
// Returns { tokens, expanded } where expanded includes synonyms for OR matching.
export function searchTokens(q: string): { tokens: string[]; expanded: string[] } {
  const raw = (q || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  const tokens = raw.filter((t) => t.length > 1 && !SEARCH_STOP.has(t))
  const set = new Set<string>(tokens.length ? tokens : raw)
  for (const t of [...set]) {
    const syns = SEARCH_SYNONYMS[t]
    if (syns) for (const s of syns) set.add(s)
    // singular/plural fold
    if (t.endsWith('s') && t.length > 3) set.add(t.slice(0, -1))
    else set.add(t + 's')
  }
  return { tokens: tokens.length ? tokens : raw, expanded: [...set] }
}

// Score a deal against the search tokens. Higher = more relevant. Weighted so
// title/brand/category matches rank above description/feature matches, and
// exact-phrase / starts-with get a bonus.
function scoreDeal(d: Deal, tokens: string[], expanded: string[], phrase: string): number {
  const title = (d.title || '').toLowerCase()
  const brand = (d.brand || '').toLowerCase()
  const cat = `${d.category_name || ''} ${d.category_slug || ''}`.toLowerCase()
  const feat = (d.features || '').toLowerCase()
  const desc = `${d.short_desc || ''} ${d.description || ''}`.toLowerCase()
  let score = 0
  if (phrase && title.includes(phrase)) score += 60
  if (phrase && title.startsWith(phrase)) score += 40
  for (const t of expanded) {
    if (!t) continue
    const exact = tokens.includes(t)
    const w = exact ? 1 : 0.5 // synonym/fold matches weigh less
    if (title.includes(t)) score += 30 * w
    if (brand.includes(t)) score += 22 * w
    if (cat.includes(t)) score += 18 * w
    if (feat.includes(t)) score += 10 * w
    if (desc.includes(t)) score += 6 * w
  }
  // tie-breakers: featured + rating + popularity
  if (d.featured) score += 4
  score += (d.rating || 0) * 1.5
  score += Math.min((d.rating_count || 0) / 50, 5)
  return score
}

export async function searchAll(
  db: D1Database,
  q: string
): Promise<{ deals: Deal[]; posts: Post[] }> {
  const phrase = (q || '').trim().toLowerCase()
  const { tokens, expanded } = searchTokens(q)
  if (!expanded.length) return { deals: [], posts: [] }

  // Build a broad SQL OR across title/brand/category/features/short_desc/description
  // for every expanded token, then score + rank in JS for relevance.
  const fields = [
    'd.title', 'd.brand', 'd.short_desc', 'd.description', 'd.features',
    'c.name', 'c.slug',
  ]
  const ors: string[] = []
  const binds: unknown[] = []
  for (const t of expanded) {
    const like = `%${t}%`
    for (const f of fields) {
      ors.push(`${f} LIKE ?`)
      binds.push(like)
    }
  }
  const sql =
    DEAL_SELECT +
    ` WHERE d.published = 1 AND (${ors.join(' OR ')}) LIMIT 200`
  const { results: rawDeals } = await db.prepare(sql).bind(...binds).all<Deal>()
  let deals = (rawDeals || [])
    .map((d) => ({ d, s: scoreDeal(d, tokens, expanded, phrase) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 60)
    .map((x) => x.d)
  for (const d of deals) d.offers = await getOffersForDeal(db, d.id)

  // Posts: token OR across title/excerpt/body
  const pOrs: string[] = []
  const pBinds: unknown[] = []
  for (const t of expanded) {
    const like = `%${t}%`
    pOrs.push('p.title LIKE ?', 'p.excerpt LIKE ?', 'p.body LIKE ?')
    pBinds.push(like, like, like)
  }
  const { results: posts } = await db
    .prepare(POST_SELECT + ` WHERE p.published = 1 AND (${pOrs.join(' OR ')}) LIMIT 20`)
    .bind(...pBinds)
    .all<Post>()
  return { deals, posts: posts || [] }
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
  spec_summary?: string
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
      `INSERT INTO deals (slug, title, category_id, brand, image_url, short_desc, description, rating, rating_count, pros, cons, spec_summary, featured, published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
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
      d.spec_summary || null,
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
      `UPDATE deals SET slug=?, title=?, category_id=?, brand=?, image_url=?, short_desc=?, description=?, rating=?, rating_count=?, pros=?, cons=?, spec_summary=?, featured=?, published=?, updated_at=?
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
      d.spec_summary || null,
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

// Cheapest in-stock (or any) price for a deal, used for price-proximity scoring.
function dealPrice(d: Deal): number | null {
  const priced = (d.offers || []).filter((o) => o.price != null)
  if (!priced.length) return null
  return Math.min(...priced.map((o) => o.price as number))
}

function tokenizeFeatures(s?: string): Set<string> {
  return new Set(
    (s || '')
      .toLowerCase()
      .split(/[,;|]/)
      .map((x) => x.trim())
      .filter(Boolean)
  )
}

// Smart content-based recommendation. Scores every candidate against the seed
// deal(s): same category (strong), same brand, shared features, price
// proximity, plus a quality boost (rating/featured). Returns the top `limit`.
export async function getRelatedDeals(
  db: D1Database,
  categoryId: number | undefined,
  excludeId: number,
  limit = 8
): Promise<Deal[]> {
  // Seed deal (so we can score by brand/features/price, not just category).
  const seed = await db
    .prepare(DEAL_SELECT + ' WHERE d.id = ?')
    .bind(excludeId)
    .first<Deal>()
  if (seed) seed.offers = await getOffersForDeal(db, seed.id)

  // Pull a generous candidate pool (same category first, then everything).
  const { results } = await db
    .prepare(
      DEAL_SELECT +
        ' WHERE d.published = 1 AND d.id != ? ORDER BY (CASE WHEN d.category_id = ? THEN 0 ELSE 1 END), d.featured DESC, d.rating DESC LIMIT 120'
    )
    .bind(excludeId, categoryId ?? -1)
    .all<Deal>()
  let pool = results || []
  for (const d of pool) d.offers = await getOffersForDeal(db, d.id)

  const seedFeatures = tokenizeFeatures(seed?.features)
  const seedPrice = seed ? dealPrice(seed) : null
  const seedBrand = (seed?.brand || '').toLowerCase()

  const scored = pool.map((d) => {
    let score = 0
    if (categoryId && d.category_id === categoryId) score += 50
    if (seedBrand && (d.brand || '').toLowerCase() === seedBrand) score += 25
    // shared features
    if (seedFeatures.size) {
      const f = tokenizeFeatures(d.features)
      let shared = 0
      for (const x of f) if (seedFeatures.has(x)) shared++
      score += shared * 8
    }
    // price proximity (closer = better, within ~40% band)
    const p = dealPrice(d)
    if (seedPrice != null && p != null && seedPrice > 0) {
      const ratio = Math.abs(p - seedPrice) / seedPrice
      if (ratio <= 0.4) score += (0.4 - ratio) / 0.4 * 20
    }
    // quality signal
    score += (d.rating || 0) * 2
    score += Math.min((d.rating_count || 0) / 50, 4)
    if (d.featured) score += 5
    return { d, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d)
}

// Recommendations for a SET of seed deals (used on search results): aggregate
// the categories/brands of the matches and recommend popular items in those
// spaces that are NOT already in the result set.
export async function getRecommendationsForDeals(
  db: D1Database,
  seeds: Deal[],
  limit = 8
): Promise<Deal[]> {
  if (!seeds.length) return []
  const seedIds = new Set(seeds.map((s) => s.id))
  const catIds = new Set(seeds.map((s) => s.category_id).filter((x): x is number => x != null))
  const brands = new Set(seeds.map((s) => (s.brand || '').toLowerCase()).filter(Boolean))

  const { results } = await db
    .prepare(
      DEAL_SELECT +
        ' WHERE d.published = 1 ORDER BY d.featured DESC, d.rating DESC, d.rating_count DESC LIMIT 150'
    )
    .all<Deal>()
  let pool = (results || []).filter((d) => !seedIds.has(d.id))
  for (const d of pool) d.offers = await getOffersForDeal(db, d.id)

  const scored = pool.map((d) => {
    let score = 0
    if (d.category_id && catIds.has(d.category_id)) score += 40
    if (d.brand && brands.has(d.brand.toLowerCase())) score += 20
    score += (d.rating || 0) * 2
    score += Math.min((d.rating_count || 0) / 50, 4)
    if (d.featured) score += 5
    return { d, score }
  })
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d)
}

// ============================================================
// AUTOCOMPLETE / SUGGESTIONS
// ============================================================

// Admin autocomplete: distinct existing values for a given field, filtered by a
// typed prefix/substring. Powers the <datalist> dropdowns in the admin editors
// (brand, retailer, author, award, tested_by, etc.) so editors reuse existing
// values (e.g. typing "b" surfaces "boAt") instead of creating inconsistent
// duplicates. We whitelist the column/table to keep this injection-safe.
const SUGGEST_SOURCES: Record<string, { table: string; column: string }> = {
  brand: { table: 'deals', column: 'brand' },
  award: { table: 'deals', column: 'award' },
  tested_by: { table: 'deals', column: 'tested_by' },
  retailer: { table: 'affiliate_links', column: 'retailer' },
  author: { table: 'posts', column: 'author' },
  author_role: { table: 'posts', column: 'author_role' },
}

export async function getFieldSuggestions(
  db: D1Database,
  field: string,
  q: string,
  limit = 8
): Promise<string[]> {
  const src = SUGGEST_SOURCES[field]
  if (!src) return []
  const term = (q || '').trim().toLowerCase()
  const col = src.column
  // Distinct, non-empty values; rank prefix matches above substring matches.
  let sql = `SELECT DISTINCT ${col} AS v FROM ${src.table} WHERE ${col} IS NOT NULL AND TRIM(${col}) <> ''`
  const binds: unknown[] = []
  if (term) {
    sql += ` AND LOWER(${col}) LIKE ?`
    binds.push(`%${term}%`)
  }
  sql += ` ORDER BY ${col} COLLATE NOCASE LIMIT 60`
  const { results } = await db.prepare(sql).bind(...binds).all<{ v: string }>()
  let vals = (results || []).map((r) => r.v).filter(Boolean)
  if (term) {
    // Prefix matches first, then the rest, both alphabetical.
    vals = vals.sort((a, b) => {
      const ap = a.toLowerCase().startsWith(term) ? 0 : 1
      const bp = b.toLowerCase().startsWith(term) ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.localeCompare(b)
    })
  }
  // De-dupe case-insensitively, preserving first (best-ranked) casing.
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of vals) {
    const k = v.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(v)
    if (out.length >= limit) break
  }
  return out
}

// Common spec labels for the spec-sheet field datalist (static, but handy).
export const COMMON_SPEC_LABELS = [
  'Material composition', 'Pattern', 'Fit type', 'Sleeve type', 'Collar style',
  'Length', 'Country of Origin', 'Care Instructions', 'Closure Type', 'Occasion',
  'Capacity', 'Wattage', 'Warranty', 'Connectivity', 'Battery', 'Display',
  'Processor', 'RAM', 'Storage', 'Screen Size', 'Resolution', 'Special Feature',
]

// Website search suggestions (Amazon/Flipkart-style typeahead). Returns a small
// ranked list of suggestion strings: matching product titles + brands +
// category names. Designed to be fast (single LIKE query, capped) and typed.
export interface SearchSuggestion {
  text: string
  type: 'product' | 'brand' | 'category'
  slug?: string
  image?: string
}

export async function getSearchSuggestions(
  db: D1Database,
  q: string,
  limit = 8
): Promise<SearchSuggestion[]> {
  const term = (q || '').trim().toLowerCase()
  if (term.length < 1) return []
  const like = `%${term}%`
  const prefixLike = `${term}%`

  // Matching products (title) — these are the most useful, show with image.
  const { results: prods } = await db
    .prepare(
      `SELECT d.title AS title, d.slug AS slug, d.image_url AS image, d.brand AS brand
       FROM deals d
       WHERE d.published = 1 AND (LOWER(d.title) LIKE ? OR LOWER(d.brand) LIKE ?)
       ORDER BY (CASE WHEN LOWER(d.title) LIKE ? THEN 0 ELSE 1 END),
                d.featured DESC, d.rating DESC
       LIMIT 30`
    )
    .bind(like, like, prefixLike)
    .all<{ title: string; slug: string; image?: string; brand?: string }>()

  // Matching categories.
  const { results: cats } = await db
    .prepare(
      `SELECT name, slug FROM categories WHERE LOWER(name) LIKE ? ORDER BY name LIMIT 5`
    )
    .bind(like)
    .all<{ name: string; slug: string }>()

  const out: SearchSuggestion[] = []
  const seen = new Set<string>()

  // Distinct brand suggestions (from matching products) first if the term looks
  // like a brand prefix.
  const brandSet = new Set<string>()
  for (const p of prods || []) {
    if (p.brand && p.brand.toLowerCase().includes(term)) {
      const k = 'b:' + p.brand.toLowerCase()
      if (!brandSet.has(p.brand.toLowerCase())) {
        brandSet.add(p.brand.toLowerCase())
        if (!seen.has(k)) {
          seen.add(k)
          out.push({ text: p.brand, type: 'brand' })
        }
      }
    }
  }

  // Category suggestions.
  for (const c of cats || []) {
    const k = 'c:' + c.name.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push({ text: c.name, type: 'category', slug: c.slug })
    }
  }

  // Product suggestions.
  for (const p of prods || []) {
    const k = 'p:' + p.slug
    if (!seen.has(k)) {
      seen.add(k)
      out.push({ text: p.title, type: 'product', slug: p.slug, image: p.image })
    }
    if (out.length >= limit + 4) break
  }

  // Interleave: keep a few brands/categories at top, products fill the rest.
  return out.slice(0, limit)
}
