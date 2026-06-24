export type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
  ADMIN_SECRET?: string
}

export interface Category {
  id: number
  slug: string
  name: string
  icon?: string
  description?: string
  sort_order: number
}

export interface AffiliateLink {
  id: number
  slug: string
  retailer: string
  dest_url: string
  label?: string
  active: number
}

export interface Offer {
  id: number
  deal_id: number
  retailer: string
  affiliate_link_id?: number
  affiliate_slug?: string
  dest_url?: string
  price?: number
  original_price?: number
  currency: string
  in_stock: number
  label?: string
}

export interface Deal {
  id: number
  slug: string
  title: string
  category_id?: number
  category_slug?: string
  category_name?: string
  brand?: string
  image_url?: string
  short_desc?: string
  description?: string
  rating?: number
  rating_count: number
  pros?: string
  cons?: string
  tested_by?: string
  verdict?: string
  award?: string
  features?: string
  spec_summary?: string
  featured: number
  published: number
  created_at: string
  updated_at: string
  offers?: Offer[]
}

export interface Post {
  id: number
  slug: string
  title: string
  excerpt?: string
  body: string
  cover_image?: string
  category_id?: number
  category_slug?: string
  category_name?: string
  author: string
  author_role?: string
  read_minutes?: number
  dek?: string
  post_type: string
  pillar: number
  published: number
  published_at: string
  updated_at: string
  // SEO controls (editable in admin)
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_image?: string
  canonical_url?: string
  noindex?: number
}

export interface Hub {
  id: number
  slug: string
  title: string
  dek?: string
  intro?: string
  cover_image?: string
  rule_type: string
  rule_value?: string
  published: number
  updated_at: string
  created_at: string
  deals?: Deal[]
}

export interface Faq {
  id: number
  parent_type: string
  parent_id: number
  question: string
  answer: string
  sort_order: number
}

export const SITE = {
  name: 'DealSpot',
  tagline: 'Tested recommendations, honestly reviewed',
  description:
    'DealSpot is an independent reviews publication. We test and research products across mobiles, tech, appliances, home and outdoor gear — then recommend only what is genuinely worth your money, with the best current price from Amazon, Flipkart and more.',
  // Update this to your real domain after deployment.
  url: 'https://dealspot.pages.dev',
  twitter: '@dealspot',
  currency: 'INR',
}
