import { SITE, type Deal, type Post, type Faq } from '../types'

function json(obj: unknown): string {
  return JSON.stringify(obj)
}

export function organizationSchema(): string {
  return json({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    logo: `${SITE.url}/static/logo.svg`,
  })
}

export function websiteSchema(): string {
  return json({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  })
}

export function breadcrumbSchema(items: { name: string; url: string }[]): string {
  return json({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: it.url.startsWith('http') ? it.url : `${SITE.url}${it.url}`,
    })),
  })
}

export function articleSchema(post: Post): string {
  return json({
    '@context': 'https://schema.org',
    '@type': post.pillar ? 'Article' : 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image ? [post.cover_image] : undefined,
    author: { '@type': 'Organization', name: post.author || SITE.name },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      logo: { '@type': 'ImageObject', url: `${SITE.url}/static/logo.svg` },
    },
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE.url}/blog/${post.slug}` },
  })
}

export function productSchema(deal: Deal): string {
  const offers = (deal.offers || []).filter((o) => o.price != null)
  const lowest = offers.length
    ? Math.min(...offers.map((o) => o.price as number))
    : undefined
  const obj: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: deal.title,
    description: deal.short_desc || deal.description,
    image: deal.image_url ? [deal.image_url] : undefined,
    brand: deal.brand ? { '@type': 'Brand', name: deal.brand } : undefined,
  }
  if (lowest != null) {
    obj.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: SITE.currency,
      lowPrice: lowest,
      highPrice: Math.max(...offers.map((o) => o.price as number)),
      offerCount: offers.length,
      availability: 'https://schema.org/InStock',
    }
  }
  // Only emit review/rating schema when we have a genuine rating.
  if (deal.rating && deal.rating_count > 0) {
    obj.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: deal.rating,
      reviewCount: deal.rating_count,
      bestRating: 5,
      worstRating: 1,
    }
  }
  // Emit an editorial Review so Google can show star ratings in the SERP.
  if (deal.rating) {
    const reviewBody =
      deal.verdict || deal.short_desc || `Our hands-on assessment of the ${deal.title}.`
    obj.review = {
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: deal.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { '@type': 'Organization', name: deal.tested_by || SITE.name },
      publisher: { '@type': 'Organization', name: SITE.name },
      reviewBody,
      datePublished: (deal.updated_at || deal.created_at || '').slice(0, 10) || undefined,
    }
  }
  return json(obj)
}

// Hub collection page — surfaces as an ItemList of the spoke products.
export function hubSchema(hub: { title: string; dek?: string; slug: string }, deals: Deal[]): string {
  return json({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: hub.title,
    description: hub.dek,
    url: `${SITE.url}/best/${hub.slug}`,
    numberOfItems: deals.length,
    itemListElement: deals.map((d, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${SITE.url}/reviews/${d.slug}`,
      name: d.title,
    })),
  })
}

export function faqSchema(faqs: Faq[]): string {
  return json({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  })
}

export function itemListSchema(deals: Deal[], listUrl: string): string {
  return json({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: listUrl.startsWith('http') ? listUrl : `${SITE.url}${listUrl}`,
    itemListElement: deals.map((d, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${SITE.url}/reviews/${d.slug}`,
      name: d.title,
    })),
  })
}
