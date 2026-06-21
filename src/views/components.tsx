import { formatPrice, discountPct, retailerMeta, timeAgo, formatDate } from '../lib/format'
import type { Deal, Offer, Post } from '../types'

// ---- Minimalist rating stars ----
export function stars(rating?: number, size = 'text-sm'): string {
  if (!rating) return ''
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  let s = ''
  for (let i = 0; i < full; i++) s += '<i class="fas fa-star"></i>'
  if (half) s += '<i class="fas fa-star-half-stroke"></i>'
  for (let i = full + (half ? 1 : 0); i < 5; i++) s += '<i class="far fa-star"></i>'
  return `<span class="stars ${size}">${s}</span>`
}

// ---- Author byline (trust signal) ----
function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export function Byline(post: Post): string {
  return `<div class="flex items-center gap-3">
    <span class="avatar">${initials(post.author || 'DS')}</span>
    <div class="leading-tight">
      <div class="text-sm font-semibold text-ink">${post.author}</div>
      <div class="text-xs text-ink-mute">${post.author_role || 'Editorial'} · ${formatDate(post.published_at)}${post.read_minutes ? ` · ${post.read_minutes} min read` : ''}</div>
    </div>
  </div>`
}

export function TestedBadge(deal: Deal): string {
  if (!deal.tested_by) return ''
  return `<div class="inline-flex items-center gap-2.5 border border-line rounded px-3 py-2 bg-surface">
    <span class="avatar !w-7 !h-7 !text-[0.7rem]">${initials(deal.tested_by)}</span>
    <div class="leading-tight text-left">
      <div class="text-[0.68rem] tracking-[0.12em] uppercase text-ink-faint">Tested by</div>
      <div class="text-sm font-semibold text-ink">${deal.tested_by}</div>
    </div>
  </div>`
}

// ---- Breadcrumbs ----
export function Breadcrumbs(items: { name: string; url?: string }[]): string {
  return `<nav class="text-[0.78rem] tracking-[0.04em] text-ink-mute mb-6" aria-label="Breadcrumb">
    ${items
      .map((it, i) => {
        const sep = i > 0 ? '<span class="mx-2 text-ink-faint">/</span>' : ''
        return it.url
          ? `${sep}<a href="${it.url}" class="hover:text-accent transition">${it.name}</a>`
          : `${sep}<span class="text-ink-soft">${it.name}</span>`
      })
      .join('')}
  </nav>`
}

// ---- CTA routed through /go/:slug ----
export function CtaButton(offer: Offer, sourcePath: string, variant: 'primary' | 'line' = 'primary'): string {
  if (!offer.affiliate_slug) return ''
  const meta = retailerMeta(offer.retailer)
  const href = `/go/${offer.affiliate_slug}?from=${encodeURIComponent(sourcePath)}`
  const cls = variant === 'primary' ? 'btn btn-primary' : 'btn btn-line'
  return `<a href="${href}" rel="nofollow sponsored noopener" target="_blank" class="${cls}">
    Check Price at ${meta.name}
    <i class="fas fa-arrow-up-right-from-square text-[0.7rem]"></i>
  </a>`
}

// ---- Dual card CTAs: vibrant "Buy Now ↗" + muted "View →" ----
export function DualCardCta(deal: Deal, sourcePath: string): string {
  const cheapest = (deal.offers || [])
    .filter((o) => o.affiliate_slug)
    .sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12))[0]
  const view = `<a href="/reviews/${deal.slug}" class="btn btn-view btn-sm flex-1">View <i class="fas fa-arrow-right text-[0.7rem]"></i></a>`
  if (!cheapest) {
    // No buyable offer — make View the full-width primary action instead
    return `<div class="flex gap-2.5"><a href="/reviews/${deal.slug}" class="btn btn-primary btn-sm flex-1">View Review <i class="fas fa-arrow-right text-[0.7rem]"></i></a></div>`
  }
  const meta = retailerMeta(cheapest.retailer)
  const buyHref = `/go/${cheapest.affiliate_slug}?from=${encodeURIComponent(sourcePath)}`
  const buy = `<a href="${buyHref}" rel="nofollow sponsored noopener" target="_blank" class="btn btn-buy btn-sm flex-1" title="Buy on ${meta.name}">
    <i class="fas fa-cart-shopping text-[0.72rem]"></i> Buy Now <i class="fas fa-arrow-up-right-from-square text-[0.62rem] opacity-80"></i>
  </a>`
  return `<div class="flex gap-2.5">${buy}${view}</div>`
}

// ---- Price comparison box (editorial, hairline rows) ----
export function PriceBox(deal: Deal, sourcePath: string): string {
  const offers = (deal.offers || []).slice().sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12))
  if (!offers.length) return ''
  const rows = offers
    .map((o, idx) => {
      const meta = retailerMeta(o.retailer)
      const disc = discountPct(o.price, o.original_price)
      const best = idx === 0
      return `<div class="flex items-center justify-between gap-4 py-4 ${idx > 0 ? 'border-t border-line' : ''}">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-semibold text-ink">${meta.name}</span>
            ${best ? '<span class="pill pill-accent">Best Price</span>' : ''}
          </div>
          <div class="flex items-baseline gap-2">
            <span class="font-serif text-xl text-ink">${o.price != null ? formatPrice(o.price, o.currency) : 'Check price'}</span>
            ${o.original_price && disc ? `<span class="text-sm line-through text-ink-faint">${formatPrice(o.original_price, o.currency)}</span><span class="text-xs text-accent font-medium">−${disc}%</span>` : ''}
          </div>
        </div>
        ${CtaButton(o, sourcePath, best ? 'primary' : 'line')}
      </div>`
    })
    .join('')
  return `<div class="card p-5">
      <div class="eyebrow eyebrow-mute mb-1">Where to buy</div>
      ${rows}
    </div>
    <p class="text-xs text-ink-faint mt-3 flex items-center gap-1.5"><i class="fas fa-circle-info"></i>Prices verified ${timeAgo(deal.updated_at)}. We may earn a commission — at no cost to you.</p>`
}

// ---- Editor's Pick card (dual CTAs, zoom image, lift + glow) ----
export function DealCard(deal: Deal, opts: { rank?: number; sourcePath?: string } = {}): string {
  const cheapest = (deal.offers || [])
    .filter((o) => o.price != null)
    .sort((a, b) => (a.price as number) - (b.price as number))[0]
  const disc = cheapest ? discountPct(cheapest.price, cheapest.original_price) : null
  const award = deal.award || (deal.featured ? "Editor's Pick" : '')
  const source = opts.sourcePath || `/reviews/${deal.slug}`

  return `<article class="card group flex flex-col h-full">
    <a href="/reviews/${deal.slug}" class="card-img block relative aspect-[5/4] bg-panel">
      ${deal.image_url
        ? `<img src="${deal.image_url}" alt="${deal.title}" loading="lazy" class="w-full h-full object-contain p-6" />`
        : `<div class="w-full h-full flex items-center justify-center text-ink-faint"><i class="fas fa-box-open text-4xl"></i></div>`}
      ${disc ? `<span class="absolute bottom-4 left-4 pill pill-accent shadow-sm">−${disc}%</span>` : ''}
      ${opts.rank ? `<span class="absolute top-4 left-4 font-serif text-lg text-ink bg-surface/90 backdrop-blur w-9 h-9 flex items-center justify-center rounded-full border border-line">${opts.rank}</span>` : ''}
      ${award ? `<span class="absolute top-4 right-4 pill pill-ink">${award}</span>` : ''}
    </a>
    <div class="p-5 flex flex-col flex-1">
      ${deal.category_name ? `<a href="/category/${deal.category_slug}" class="eyebrow text-[0.66rem] mb-2 block">${deal.category_name}</a>` : ''}
      <h3 class="font-serif text-lg leading-snug text-ink mb-2 line-clamp-2"><a href="/reviews/${deal.slug}" class="hover:text-accent transition">${deal.title}</a></h3>
      ${deal.verdict ? `<p class="text-sm text-ink-mute italic leading-relaxed line-clamp-2 mb-3 font-serif">${deal.verdict}</p>` : ''}
      ${deal.rating ? `<div class="flex items-center gap-2 mb-3">${stars(deal.rating, 'text-xs')}<span class="text-xs text-ink-faint">${deal.rating.toFixed(1)}</span></div>` : '<div class="mb-3"></div>'}
      <div class="mt-auto pt-4 border-t border-line-soft">
        <div class="flex items-baseline gap-2 mb-3.5">
          ${cheapest
            ? `<span class="text-[0.66rem] uppercase tracking-[0.1em] text-ink-faint">From</span><span class="font-serif text-xl text-ink">${formatPrice(cheapest.price, cheapest.currency)}</span>${cheapest.original_price && disc ? `<span class="text-sm line-through text-ink-faint">${formatPrice(cheapest.original_price, cheapest.currency)}</span>` : ''}`
            : '<span class="text-sm text-ink-faint">Price on retailer site</span>'}
        </div>
        ${DualCardCta(deal, source)}
      </div>
    </div>
  </article>`
}

export function DealGrid(deals: Deal[], ranked = false, sourcePath?: string): string {
  if (!deals.length)
    return `<div class="text-center py-20 text-ink-faint"><i class="fas fa-box-open text-3xl mb-3"></i><p>Nothing here yet — check back soon.</p></div>`
  return `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">${deals
    .map((d, i) => DealCard(d, { rank: ranked ? i + 1 : undefined, sourcePath }))
    .join('')}</div>`
}

// ---- Comparison table (editorial) ----
export function ComparisonTable(deals: Deal[], sourcePath: string): string {
  if (!deals.length) return ''
  const rows = deals
    .map((d, idx) => {
      const cheapest = (d.offers || [])
        .filter((o) => o.price != null)
        .sort((a, b) => (a.price as number) - (b.price as number))[0]
      return `<tr class="border-t border-line">
        <td class="py-5 pr-3 align-top"><span class="font-serif text-xl text-accent">${idx + 1}</span></td>
        <td class="py-5 pr-3 align-top">
          <div class="flex items-center gap-3">
            ${d.image_url ? `<img src="${d.image_url}" alt="${d.title}" loading="lazy" class="w-14 h-14 object-contain bg-panel rounded shrink-0" />` : ''}
            <div>
              <a href="/reviews/${d.slug}" class="font-serif text-base text-ink hover:text-accent transition leading-snug">${d.title}</a>
              ${d.award ? `<div class="mt-1"><span class="pill pill-accent">${d.award}</span></div>` : ''}
            </div>
          </div>
        </td>
        <td class="py-5 pr-3 align-top whitespace-nowrap">${d.rating ? `${stars(d.rating, 'text-xs')}<div class="text-xs text-ink-faint mt-1">${d.rating.toFixed(1)} / 5</div>` : '—'}</td>
        <td class="py-5 pr-3 align-top whitespace-nowrap font-serif text-lg text-ink">${cheapest ? formatPrice(cheapest.price, cheapest.currency) : '—'}</td>
        <td class="py-5 align-top text-right">${cheapest ? CtaButton(cheapest, sourcePath, 'line') : ''}</td>
      </tr>`
    })
    .join('')
  return `<div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left"><th class="pb-3 eyebrow eyebrow-mute font-semibold">Rank</th><th class="pb-3 eyebrow eyebrow-mute font-semibold">Product</th><th class="pb-3 eyebrow eyebrow-mute font-semibold">Rating</th><th class="pb-3 eyebrow eyebrow-mute font-semibold">From</th><th class="pb-3"></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

// ---- Pros / Cons ----
export function ProsCons(deal: Deal): string {
  const pros = (deal.pros || '').split('\n').filter(Boolean)
  const cons = (deal.cons || '').split('\n').filter(Boolean)
  if (!pros.length && !cons.length) return ''
  return `<div class="grid sm:grid-cols-2 gap-px bg-line border border-line rounded overflow-hidden my-2">
    <div class="bg-surface p-6">
      <h4 class="eyebrow eyebrow-mute mb-4 flex items-center gap-2"><span class="kicker-rule"></span>What we liked</h4>
      <ul class="space-y-3 text-[0.95rem] text-ink-soft">${pros.map((p) => `<li class="flex gap-3"><i class="fas fa-check text-accent mt-1.5 text-xs"></i><span>${p}</span></li>`).join('')}</ul>
    </div>
    <div class="bg-surface p-6">
      <h4 class="eyebrow eyebrow-mute mb-4 flex items-center gap-2"><span class="kicker-rule !bg-ink-faint"></span>Worth noting</h4>
      <ul class="space-y-3 text-[0.95rem] text-ink-soft">${cons.map((c) => `<li class="flex gap-3"><i class="fas fa-minus text-ink-faint mt-1.5 text-xs"></i><span>${c}</span></li>`).join('')}</ul>
    </div>
  </div>`
}

// ---- Post card (editorial) ----
export function PostCard(post: Post): string {
  return `<article class="card group flex flex-col h-full">
    <a href="/blog/${post.slug}" class="card-img block aspect-[16/10] bg-panel">
      ${post.cover_image
        ? `<img src="${post.cover_image}" alt="${post.title}" loading="lazy" class="w-full h-full object-cover" />`
        : `<div class="w-full h-full flex items-center justify-center text-ink-faint"><i class="fas fa-feather text-3xl"></i></div>`}
    </a>
    <div class="p-6 flex flex-col flex-1">
      <div class="eyebrow text-[0.66rem] mb-3">${post.pillar ? 'Buying Guide' : post.category_name || 'Journal'}</div>
      <h3 class="font-serif text-xl leading-snug text-ink mb-2 line-clamp-2"><a href="/blog/${post.slug}" class="hover:text-accent transition">${post.title}</a></h3>
      <p class="text-[0.95rem] text-ink-mute line-clamp-2 leading-relaxed mb-5">${post.dek || post.excerpt || ''}</p>
      <div class="mt-auto pt-4 border-t border-line-soft flex items-center justify-between text-xs text-ink-faint">
        <span>${post.author}</span>
        <span>${post.read_minutes ? `${post.read_minutes} min` : timeAgo(post.published_at)}</span>
      </div>
    </div>
  </article>`
}

// ---- FAQ ----
export function FaqSection(faqs: { question: string; answer: string }[]): string {
  if (!faqs.length) return ''
  return `<section class="my-16 max-w-reading">
    <div class="eyebrow mb-2">Questions</div>
    <h2 class="font-serif text-3xl text-ink mb-8">Frequently asked</h2>
    <div class="divide-y divide-line border-t border-b border-line">
      ${faqs
        .map(
          (f) => `<details class="group py-5">
        <summary class="font-serif text-lg text-ink cursor-pointer flex justify-between items-start gap-4">${f.question}<i class="fas fa-plus text-ink-faint text-sm mt-1.5 group-open:rotate-45 transition-transform shrink-0"></i></summary>
        <p class="mt-3 text-ink-soft leading-relaxed text-[0.98rem]">${f.answer}</p>
      </details>`
        )
        .join('')}
    </div>
  </section>`
}

// ---- Newsletter (editorial, restrained) ----
export function NewsletterBox(): string {
  return `<section class="my-20">
    <div class="max-w-editorial mx-auto border-y border-line py-16 text-center">
      <div class="eyebrow mb-3">The Dispatch</div>
      <h2 class="font-serif text-3xl md:text-4xl text-ink mb-3 max-w-xl mx-auto leading-tight">Worthwhile finds, once a week</h2>
      <p class="text-ink-mute mb-8 max-w-md mx-auto leading-relaxed">A short, considered note with the few deals we think are genuinely worth your attention. No noise, no spam.</p>
      <form id="newsletter-form" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <input type="email" name="email" required placeholder="you@example.com" class="flex-1 bg-surface border border-line focus:border-ink outline-none px-4 py-3 rounded text-ink placeholder:text-ink-faint transition" />
        <button type="submit" class="btn btn-primary justify-center">Subscribe</button>
      </form>
      <p id="newsletter-msg" class="text-sm mt-4 text-ink-mute"></p>
    </div>
  </section>`
}

// ---- Section header (editorial) ----
export function SectionHeader(title: string, eyebrow?: string, link?: { text: string; href: string }): string {
  return `<div class="flex items-end justify-between gap-6 mb-10">
    <div>
      ${eyebrow ? `<div class="eyebrow mb-3 flex items-center gap-3"><span class="kicker-rule"></span>${eyebrow}</div>` : ''}
      <h2 class="font-serif text-3xl md:text-[2.5rem] text-ink leading-tight">${title}</h2>
    </div>
    ${link ? `<a href="${link.href}" class="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-ink link-underline whitespace-nowrap pb-1">${link.text} <i class="fas fa-arrow-right text-xs"></i></a>` : ''}
  </div>`
}

export function AffiliateNotice(): string {
  return `<div class="flex items-start gap-3 text-sm text-ink-mute border-l-2 border-accent pl-4 py-1 mb-8">
    <span>We independently research everything we recommend. When you buy through links on this page, we may earn a commission — it never affects our verdict. <a href="/affiliate-disclosure" class="text-accent underline underline-offset-2">How this works</a>.</span>
  </div>`
}
