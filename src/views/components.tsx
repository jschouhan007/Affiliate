import { formatPrice, discountPct, retailerMeta, timeAgo } from '../lib/format'
import type { Deal, Offer, Post } from '../types'

function stars(rating?: number): string {
  if (!rating) return ''
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  let s = ''
  for (let i = 0; i < full; i++) s += '<i class="fas fa-star"></i>'
  if (half) s += '<i class="fas fa-star-half-stroke"></i>'
  for (let i = full + (half ? 1 : 0); i < 5; i++) s += '<i class="far fa-star"></i>'
  return `<span class="text-amber-400">${s}</span>`
}

export function Breadcrumbs(items: { name: string; url?: string }[]): string {
  return `<nav class="text-sm text-slate-500 mb-4" aria-label="Breadcrumb">
    ${items
      .map((it, i) => {
        const sep = i > 0 ? '<i class="fas fa-chevron-right text-xs mx-2 text-slate-300"></i>' : ''
        return it.url
          ? `${sep}<a href="${it.url}" class="hover:text-indigo-600">${it.name}</a>`
          : `${sep}<span class="text-slate-700 font-medium">${it.name}</span>`
      })
      .join('')}
  </nav>`
}

// Compact CTA button that routes through /go/:slug
export function CtaButton(offer: Offer, sourcePath: string): string {
  const meta = retailerMeta(offer.retailer)
  if (!offer.affiliate_slug) return ''
  const href = `/go/${offer.affiliate_slug}?from=${encodeURIComponent(sourcePath)}`
  return `<a href="${href}" rel="nofollow sponsored noopener" target="_blank"
    class="inline-flex items-center justify-center gap-2 ${meta.color} font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm">
    <i class="${meta.icon}"></i>
    ${offer.label || `Buy on ${meta.name}`}
    ${offer.price != null ? `<span class="font-bold">${formatPrice(offer.price, offer.currency)}</span>` : ''}
  </a>`
}

// Full price box listing all retailer offers for a deal
export function PriceBox(deal: Deal, sourcePath: string): string {
  const offers = (deal.offers || []).slice().sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12))
  if (!offers.length) return ''
  const rows = offers
    .map((o, idx) => {
      const meta = retailerMeta(o.retailer)
      const disc = discountPct(o.price, o.original_price)
      const best = idx === 0
      return `<div class="flex items-center justify-between gap-3 p-3 rounded-xl ${best ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}">
        <div class="flex items-center gap-3 min-w-0">
          <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg ${meta.color}"><i class="${meta.icon}"></i></span>
          <div class="min-w-0">
            <div class="font-semibold text-slate-800 truncate">${meta.name} ${best ? '<span class="text-[10px] uppercase tracking-wide bg-emerald-600 text-white px-1.5 py-0.5 rounded ml-1">Best price</span>' : ''}</div>
            <div class="text-sm">
              <span class="font-bold text-slate-900">${o.price != null ? formatPrice(o.price, o.currency) : 'Check price'}</span>
              ${o.original_price && disc ? `<span class="line-through text-slate-400 ml-2">${formatPrice(o.original_price, o.currency)}</span><span class="text-emerald-600 ml-1 font-medium">${disc}% off</span>` : ''}
            </div>
          </div>
        </div>
        ${CtaButton(o, sourcePath)}
      </div>`
    })
    .join('')
  return `<div class="space-y-2">${rows}</div>
    <p class="text-xs text-slate-400 mt-2"><i class="fas fa-circle-info mr-1"></i>Prices updated ${timeAgo(deal.updated_at)}. We may earn a commission on purchases.</p>`
}

export function DealCard(deal: Deal): string {
  const cheapest = (deal.offers || [])
    .filter((o) => o.price != null)
    .sort((a, b) => (a.price as number) - (b.price as number))[0]
  const disc = cheapest ? discountPct(cheapest.price, cheapest.original_price) : null
  return `<article class="group bg-white rounded-2xl border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden flex flex-col">
    <a href="/reviews/${deal.slug}" class="block relative aspect-[4/3] bg-slate-100 overflow-hidden">
      ${deal.image_url
        ? `<img src="${deal.image_url}" alt="${deal.title}" loading="lazy" class="w-full h-full object-contain p-4 group-hover:scale-105 transition" />`
        : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="fas fa-box-open text-5xl"></i></div>`}
      ${disc ? `<span class="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-lg">${disc}% OFF</span>` : ''}
      ${deal.featured ? `<span class="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-lg"><i class="fas fa-star mr-1"></i>Top Pick</span>` : ''}
    </a>
    <div class="p-4 flex flex-col flex-1">
      ${deal.category_name ? `<a href="/category/${deal.category_slug}" class="text-xs font-medium text-indigo-500 mb-1">${deal.category_name}</a>` : ''}
      <h3 class="font-semibold text-slate-800 leading-snug line-clamp-2 mb-1"><a href="/reviews/${deal.slug}" class="hover:text-indigo-600">${deal.title}</a></h3>
      ${deal.rating ? `<div class="text-sm mb-2">${stars(deal.rating)} <span class="text-slate-400 text-xs">${deal.rating.toFixed(1)}</span></div>` : ''}
      <div class="mt-auto">
        ${cheapest
          ? `<div class="flex items-baseline gap-2">
              <span class="text-lg font-bold text-slate-900">${formatPrice(cheapest.price, cheapest.currency)}</span>
              ${cheapest.original_price && disc ? `<span class="text-sm line-through text-slate-400">${formatPrice(cheapest.original_price, cheapest.currency)}</span>` : ''}
            </div>`
          : `<span class="text-slate-400 text-sm">Check latest price</span>`}
        <a href="/reviews/${deal.slug}" class="mt-3 block text-center bg-indigo-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-indigo-700 transition">View Deal</a>
      </div>
    </div>
  </article>`
}

export function DealGrid(deals: Deal[]): string {
  if (!deals.length)
    return `<div class="text-center py-16 text-slate-400"><i class="fas fa-box-open text-4xl mb-3"></i><p>No deals here yet — check back soon.</p></div>`
  return `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">${deals
    .map(DealCard)
    .join('')}</div>`
}

export function ComparisonTable(deals: Deal[], sourcePath: string): string {
  if (!deals.length) return ''
  const rows = deals
    .map((d, idx) => {
      const cheapest = (d.offers || [])
        .filter((o) => o.price != null)
        .sort((a, b) => (a.price as number) - (b.price as number))[0]
      return `<tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="p-3 font-bold text-slate-400">#${idx + 1}</td>
        <td class="p-3">
          <div class="flex items-center gap-3">
            ${d.image_url ? `<img src="${d.image_url}" alt="${d.title}" loading="lazy" class="w-12 h-12 object-contain rounded" />` : ''}
            <a href="/reviews/${d.slug}" class="font-medium text-slate-800 hover:text-indigo-600">${d.title}</a>
          </div>
        </td>
        <td class="p-3 whitespace-nowrap">${d.rating ? `${stars(d.rating)} <span class="text-xs text-slate-400">${d.rating.toFixed(1)}</span>` : '—'}</td>
        <td class="p-3 font-bold text-slate-900 whitespace-nowrap">${cheapest ? formatPrice(cheapest.price, cheapest.currency) : '—'}</td>
        <td class="p-3">${cheapest ? CtaButton(cheapest, sourcePath) : ''}</td>
      </tr>`
    })
    .join('')
  return `<div class="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
    <table class="w-full text-sm">
      <thead class="bg-slate-100 text-slate-600 text-left">
        <tr><th class="p-3">Rank</th><th class="p-3">Product</th><th class="p-3">Rating</th><th class="p-3">Best Price</th><th class="p-3">Buy</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

export function ProsCons(deal: Deal): string {
  const pros = (deal.pros || '').split('\n').filter(Boolean)
  const cons = (deal.cons || '').split('\n').filter(Boolean)
  if (!pros.length && !cons.length) return ''
  return `<div class="grid sm:grid-cols-2 gap-4 my-6">
    <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
      <h4 class="font-bold text-emerald-700 mb-3"><i class="fas fa-circle-check mr-2"></i>Pros</h4>
      <ul class="space-y-2 text-sm text-slate-700">${pros.map((p) => `<li class="flex gap-2"><i class="fas fa-check text-emerald-500 mt-1"></i><span>${p}</span></li>`).join('')}</ul>
    </div>
    <div class="bg-rose-50 border border-rose-100 rounded-2xl p-5">
      <h4 class="font-bold text-rose-700 mb-3"><i class="fas fa-circle-xmark mr-2"></i>Cons</h4>
      <ul class="space-y-2 text-sm text-slate-700">${cons.map((c) => `<li class="flex gap-2"><i class="fas fa-xmark text-rose-500 mt-1"></i><span>${c}</span></li>`).join('')}</ul>
    </div>
  </div>`
}

export function PostCard(post: Post): string {
  return `<article class="bg-white rounded-2xl border border-slate-100 hover:shadow-lg transition overflow-hidden flex flex-col">
    <a href="/blog/${post.slug}" class="block aspect-[16/9] bg-slate-100 overflow-hidden">
      ${post.cover_image
        ? `<img src="${post.cover_image}" alt="${post.title}" loading="lazy" class="w-full h-full object-cover hover:scale-105 transition" />`
        : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="fas fa-newspaper text-4xl"></i></div>`}
    </a>
    <div class="p-5 flex flex-col flex-1">
      ${post.category_name ? `<span class="text-xs font-medium text-indigo-500 mb-1">${post.category_name}${post.pillar ? ' · Buying Guide' : ''}</span>` : ''}
      <h3 class="font-bold text-slate-800 leading-snug mb-2 line-clamp-2"><a href="/blog/${post.slug}" class="hover:text-indigo-600">${post.title}</a></h3>
      <p class="text-sm text-slate-500 line-clamp-2 mb-3">${post.excerpt || ''}</p>
      <div class="mt-auto text-xs text-slate-400 flex items-center gap-2"><i class="fas fa-clock"></i>${timeAgo(post.published_at)}</div>
    </div>
  </article>`
}

export function FaqSection(faqs: { question: string; answer: string }[]): string {
  if (!faqs.length) return ''
  return `<section class="my-10">
    <h2 class="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
    <div class="space-y-3">
      ${faqs
        .map(
          (f) => `<details class="group bg-white border border-slate-100 rounded-xl p-4">
        <summary class="font-semibold cursor-pointer flex justify-between items-center list-none">${f.question}<i class="fas fa-chevron-down text-slate-400 group-open:rotate-180 transition"></i></summary>
        <p class="mt-3 text-slate-600 leading-relaxed">${f.answer}</p>
      </details>`
        )
        .join('')}
    </div>
  </section>`
}

export function NewsletterBox(): string {
  return `<section class="my-12 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-10 text-white text-center">
    <h2 class="text-2xl md:text-3xl font-bold mb-2">Never miss a great deal</h2>
    <p class="text-indigo-100 mb-6 max-w-xl mx-auto">Get the best hand-picked deals from Amazon, Flipkart & more delivered to your inbox. No spam, unsubscribe anytime.</p>
    <form id="newsletter-form" class="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
      <input type="email" name="email" required placeholder="you@example.com" class="flex-1 px-4 py-3 rounded-xl text-slate-800 outline-none" />
      <button type="submit" class="bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition">Subscribe</button>
    </form>
    <p id="newsletter-msg" class="text-sm mt-3 text-indigo-100"></p>
  </section>`
}

export function SectionHeader(title: string, subtitle?: string, link?: { text: string; href: string }): string {
  return `<div class="flex items-end justify-between mb-5">
    <div>
      <h2 class="text-2xl font-bold text-slate-900">${title}</h2>
      ${subtitle ? `<p class="text-slate-500 text-sm mt-1">${subtitle}</p>` : ''}
    </div>
    ${link ? `<a href="${link.href}" class="text-indigo-600 font-medium text-sm hover:underline whitespace-nowrap">${link.text} <i class="fas fa-arrow-right ml-1"></i></a>` : ''}
  </div>`
}

export function AffiliateNotice(): string {
  return `<div class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-2.5 mb-6 flex items-start gap-2">
    <i class="fas fa-circle-info mt-0.5"></i>
    <span>This page contains affiliate links. If you buy through them, we may earn a commission at no extra cost to you. <a href="/affiliate-disclosure" class="underline font-medium">Learn more</a>.</span>
  </div>`
}
