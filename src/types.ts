export type Bindings = {
  DB: D1Database
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
  post_type: string
  pillar: number
  published: number
  published_at: string
  updated_at: string
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
  tagline: 'Hand-picked best deals from Amazon, Flipkart & more',
  description:
    'DealSpot finds and verifies the best deals across mobiles, tech, appliances, home, and outdoor gear from Amazon, Flipkart and other Indian retailers — with honest reviews and buying guides.',
  // Update this to your real domain after deployment.
  url: 'https://dealspot.pages.dev',
  twitter: '@dealspot',
  currency: 'INR',
}
