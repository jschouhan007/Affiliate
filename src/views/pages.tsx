import { SITE, type Category, type Deal, type Post } from '../types'
import { renderMarkdown } from '../lib/markdown'
import { formatPrice, discountPct, formatDate, timeAgo } from '../lib/format'
import {
  Breadcrumbs,
  DealGrid,
  DealCard,
  PostCard,
  PriceBox,
  ProsCons,
  ComparisonTable,
  FaqSection,
  NewsletterBox,
  SectionHeader,
  AffiliateNotice,
  Byline,
  TestedBadge,
  stars,
} from './components'

// ============================================================
// HOME — editorial, asymmetric
// ============================================================
export function HomePage(data: {
  categories: Category[]
  featured: Deal[]
  latestDeals: Deal[]
  pillars: Post[]
  posts: Post[]
}): string {
  const { categories, featured, latestDeals, pillars, posts } = data
  const lead = featured[0]
  const secondary = featured.slice(1, 4)
  const restFeatured = featured.slice(4, 8)

  const catRow = categories
    .map(
      (c) =>
        `<a href="/category/${c.slug}" class="group flex items-center gap-2.5 whitespace-nowrap text-sm text-ink-soft hover:text-accent transition py-1">
          <i class="${c.icon || 'fas fa-tag'} text-ink-faint group-hover:text-accent transition"></i>${c.name}
        </a>`
    )
    .join('<span class="text-line">·</span>')

  return `
  <!-- HERO: asymmetric 60/40 editorial split -->
  <section class="max-w-editorial mx-auto px-5 pt-16 md:pt-24 pb-16">
    <div class="max-w-3xl">
      <div class="eyebrow mb-5 flex items-center gap-3 fade-up"><span class="kicker-rule"></span>Independent reviews &amp; tested recommendations</div>
      <h1 class="font-serif text-[2.6rem] md:text-[4.2rem] leading-[1.04] text-ink fade-up">We test it first.<br/>Then we tell you the <em class="text-accent not-italic font-normal italic">truth</em>.</h1>
      <p class="mt-7 text-lg md:text-xl text-ink-soft leading-relaxed max-w-2xl fade-up">No hype, no padded discounts. Just carefully researched picks across mobiles, tech, appliances and home — paired with the genuine best price from Amazon, Flipkart and beyond.</p>
      <div class="mt-9 flex flex-wrap items-center gap-4 fade-up">
        <a href="/guides" class="btn btn-primary">Browse Buying Guides <i class="fas fa-arrow-right text-xs"></i></a>
        <a href="/deals" class="btn btn-ghost">See all deals</a>
      </div>
    </div>
  </section>

  <!-- Category ribbon -->
  <div class="border-y border-line bg-panel/60">
    <div class="max-w-editorial mx-auto px-5 py-4 flex items-center gap-4 overflow-x-auto">
      <span class="eyebrow eyebrow-mute whitespace-nowrap">Browse</span>
      <span class="text-line">·</span>
      ${catRow}
    </div>
  </div>

  <div class="max-w-editorial mx-auto px-5">
    ${lead ? `
    <!-- Featured: large lead + stacked secondary (asymmetric) -->
    <section class="py-20">
      ${SectionHeader("This week's picks", 'Editors’ Choice', { text: 'All deals', href: '/deals' })}
      <div class="grid lg:grid-cols-12 gap-8">
        <!-- Lead story 60% -->
        <article class="lg:col-span-7 card group flex flex-col">
          <a href="/reviews/${lead.slug}" class="card-img block aspect-[16/10] bg-panel relative">
            ${lead.image_url ? `<img src="${lead.image_url}" alt="${lead.title}" class="w-full h-full object-contain p-10" />` : ''}
            <span class="absolute top-5 left-5 pill pill-ink">${lead.award || "Editor's Pick"}</span>
          </a>
          <div class="p-8">
            ${lead.category_name ? `<a href="/category/${lead.category_slug}" class="eyebrow mb-3 block">${lead.category_name}</a>` : ''}
            <h3 class="font-serif text-3xl leading-tight text-ink mb-3"><a href="/reviews/${lead.slug}" class="hover:text-accent transition">${lead.title}</a></h3>
            ${lead.verdict ? `<p class="font-serif italic text-lg text-ink-soft leading-relaxed mb-5">"${lead.verdict}"</p>` : ''}
            <div class="flex items-center justify-between pt-5 border-t border-line-soft">
              ${lead.rating ? `<div class="flex items-center gap-2">${stars(lead.rating)}<span class="text-sm text-ink-faint">${lead.rating.toFixed(1)}</span></div>` : '<span></span>'}
              <a href="/reviews/${lead.slug}" class="text-sm font-medium text-accent link-underline">Read the full review</a>
            </div>
          </div>
        </article>
        <!-- Secondary 40% stacked -->
        <div class="lg:col-span-5 flex flex-col gap-5">
          ${secondary
            .map(
              (d) => `<a href="/reviews/${d.slug}" class="group flex gap-5 items-center card p-4">
            <div class="card-img w-28 h-28 bg-panel rounded shrink-0 overflow-hidden flex items-center justify-center">${d.image_url ? `<img src="${d.image_url}" alt="${d.title}" class="w-full h-full object-contain p-3" />` : ''}</div>
            <div class="min-w-0">
              ${d.category_name ? `<div class="eyebrow text-[0.62rem] mb-1">${d.category_name}</div>` : ''}
              <h4 class="font-serif text-lg leading-snug text-ink line-clamp-2 group-hover:text-accent transition">${d.title}</h4>
              ${d.rating ? `<div class="mt-1.5 flex items-center gap-1.5">${stars(d.rating, 'text-[0.65rem]')}<span class="text-xs text-ink-faint">${d.rating.toFixed(1)}</span></div>` : ''}
            </div>
          </a>`
            )
            .join('')}
        </div>
      </div>
    </section>` : ''}

    ${pillars.length ? `
    <section class="py-20 border-t border-line">
      ${SectionHeader('Buying guides', 'Deep dives', { text: 'All guides', href: '/guides' })}
      <div class="grid md:grid-cols-3 gap-8">${pillars.map(PostCard).join('')}</div>
    </section>` : ''}

    ${restFeatured.length || latestDeals.length ? `
    <section class="py-20 border-t border-line">
      ${SectionHeader('Recently reviewed', 'Fresh from the bench', { text: 'See more', href: '/deals' })}
      ${DealGrid((restFeatured.length ? restFeatured : latestDeals).slice(0, 6))}
    </section>` : ''}
  </div>

  ${NewsletterBox()}

  ${posts.length ? `
  <div class="max-w-editorial mx-auto px-5">
    <section class="py-20 border-t border-line">
      ${SectionHeader('From the Journal', 'Reading', { text: 'The Journal', href: '/blog' })}
      <div class="grid md:grid-cols-3 gap-8">${posts.map(PostCard).join('')}</div>
    </section>
  </div>` : ''}`
}

// ============================================================
// DEALS LISTING
// ============================================================
export function DealsPage(data: { deals: Deal[]; title: string; subtitle?: string; crumbs: { name: string; url?: string }[] }): string {
  return `<div class="max-w-editorial mx-auto px-5 py-16">
    ${Breadcrumbs(data.crumbs)}
    <header class="max-w-2xl mb-14">
      <div class="eyebrow mb-4 flex items-center gap-3"><span class="kicker-rule"></span>The collection</div>
      <h1 class="font-serif text-4xl md:text-5xl text-ink leading-tight">${data.title}</h1>
      ${data.subtitle ? `<p class="mt-5 text-lg text-ink-soft leading-relaxed">${data.subtitle}</p>` : ''}
    </header>
    ${DealGrid(data.deals)}
  </div>`
}

// ============================================================
// CATEGORY
// ============================================================
export function CategoryPage(data: { category: Category; deals: Deal[]; pillars: Post[] }): string {
  const { category, deals, pillars } = data
  return `<div class="max-w-editorial mx-auto px-5 py-16">
    ${Breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Categories', url: '/deals' }, { name: category.name }])}
    <header class="max-w-2xl mb-14">
      <div class="eyebrow mb-4 flex items-center gap-3"><span class="kicker-rule"></span><i class="${category.icon || 'fas fa-tag'}"></i> Category</div>
      <h1 class="font-serif text-4xl md:text-5xl text-ink leading-tight">${category.name}</h1>
      <p class="mt-5 text-lg text-ink-soft leading-relaxed">${category.description || `Our tested ${category.name.toLowerCase()} recommendations, with the best current prices.`}</p>
    </header>
    ${pillars.length ? `<section class="mb-20">
      ${SectionHeader(`Guides for ${category.name.toLowerCase()}`, 'Start here')}
      <div class="grid md:grid-cols-3 gap-8">${pillars.map(PostCard).join('')}</div>
    </section>` : ''}
    ${SectionHeader('Every pick', 'The list')}
    ${DealGrid(deals)}
  </div>`
}

// ============================================================
// REVIEW (money page) — editorial asymmetric
// ============================================================
export function ReviewPage(data: {
  deal: Deal
  faqs: { question: string; answer: string }[]
  related: Deal[]
  sourcePath: string
}): string {
  const { deal, faqs, related, sourcePath } = data
  const cheapest = (deal.offers || []).filter((o) => o.price != null).sort((a, b) => (a.price as number) - (b.price as number))[0]
  const disc = cheapest ? discountPct(cheapest.price, cheapest.original_price) : null

  return `<div class="max-w-editorial mx-auto px-5 py-12">
    ${Breadcrumbs([
      { name: 'Home', url: '/' },
      ...(deal.category_name ? [{ name: deal.category_name, url: `/category/${deal.category_slug}` }] : []),
      { name: deal.title },
    ])}

    <!-- Asymmetric hero: 55% media / 45% verdict -->
    <div class="grid lg:grid-cols-12 gap-12 items-start">
      <div class="lg:col-span-6">
        <div class="card p-10 aspect-square flex items-center justify-center bg-panel sticky top-28">
          ${deal.image_url ? `<img src="${deal.image_url}" alt="${deal.title}" class="max-h-full object-contain" />` : `<i class="fas fa-box-open text-6xl text-ink-faint"></i>`}
        </div>
      </div>
      <div class="lg:col-span-6">
        ${deal.award ? `<span class="pill pill-accent mb-4">${deal.award}</span>` : ''}
        ${deal.brand ? `<div class="eyebrow eyebrow-mute mb-2">${deal.brand}</div>` : ''}
        <h1 class="font-serif text-4xl md:text-5xl leading-[1.05] text-ink">${deal.title}</h1>
        ${deal.verdict ? `<p class="mt-5 font-serif italic text-xl text-ink-soft leading-relaxed">"${deal.verdict}"</p>` : ''}
        ${deal.rating ? `<div class="mt-5 flex items-center gap-3">${stars(deal.rating, 'text-base')}<span class="text-sm text-ink-mute">${deal.rating.toFixed(1)} / 5 · our verdict${deal.rating_count ? ` · ${deal.rating_count.toLocaleString('en-IN')} owner ratings` : ''}</span></div>` : ''}
        ${deal.short_desc ? `<p class="mt-5 text-ink-soft leading-relaxed">${deal.short_desc}</p>` : ''}
        ${deal.tested_by ? `<div class="mt-6">${TestedBadge(deal)}</div>` : ''}
        ${cheapest ? `<div class="mt-7 flex items-baseline gap-3">
          <span class="text-[0.66rem] uppercase tracking-[0.12em] text-ink-faint">Best price</span>
          <span class="font-serif text-3xl text-ink">${formatPrice(cheapest.price, cheapest.currency)}</span>
          ${cheapest.original_price && disc ? `<span class="text-base line-through text-ink-faint">${formatPrice(cheapest.original_price, cheapest.currency)}</span>` : ''}
        </div>` : ''}
        <div class="mt-5">${PriceBox(deal, sourcePath)}</div>
      </div>
    </div>

    ${(deal.pros || deal.cons) ? `<section class="mt-20 max-w-4xl">
      <div class="eyebrow mb-6 flex items-center gap-3"><span class="kicker-rule"></span>The verdict at a glance</div>
      ${ProsCons(deal)}
    </section>` : ''}

    ${deal.description ? `<section class="mt-16">
      <div class="eyebrow mb-3">Full review</div>
      <h2 class="font-serif text-3xl text-ink mb-8">Our take</h2>
      <div class="prose-area dropcap">${renderMarkdown(deal.description)}</div>
    </section>` : ''}

    ${FaqSection(faqs)}

    ${related.length ? `<section class="mt-20 pt-16 border-t border-line">
      ${SectionHeader('Considered alongside', 'Alternatives')}
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">${related.map((d) => DealCard(d)).join('')}</div>
    </section>` : ''}
  </div>
  ${NewsletterBox()}`
}

// ============================================================
// BLOG INDEX — editorial lead + grid
// ============================================================
export function BlogIndexPage(data: { posts: Post[]; title: string; subtitle: string; crumbs: { name: string; url?: string }[] }): string {
  const [hero, ...rest] = data.posts
  return `<div class="max-w-editorial mx-auto px-5 py-16">
    ${Breadcrumbs(data.crumbs)}
    <header class="max-w-2xl mb-16">
      <div class="eyebrow mb-4 flex items-center gap-3"><span class="kicker-rule"></span>Long reads</div>
      <h1 class="font-serif text-4xl md:text-5xl text-ink leading-tight">${data.title}</h1>
      <p class="mt-5 text-lg text-ink-soft leading-relaxed">${data.subtitle}</p>
    </header>
    ${!data.posts.length ? '<p class="text-ink-faint py-16 text-center">No stories published yet.</p>' : ''}
    ${hero ? `<a href="/blog/${hero.slug}" class="group grid lg:grid-cols-12 gap-10 items-center mb-20 pb-20 border-b border-line">
      <div class="lg:col-span-7 card-img aspect-[16/10] bg-panel rounded overflow-hidden border border-line">${hero.cover_image ? `<img src="${hero.cover_image}" alt="${hero.title}" class="w-full h-full object-cover group-hover:scale-[1.03] transition duration-700" />` : `<div class="w-full h-full flex items-center justify-center text-ink-faint"><i class="fas fa-feather text-4xl"></i></div>`}</div>
      <div class="lg:col-span-5">
        <div class="eyebrow mb-4">${hero.pillar ? 'Buying Guide' : hero.category_name || 'Journal'}</div>
        <h2 class="font-serif text-3xl md:text-4xl leading-tight text-ink mb-4 group-hover:text-accent transition">${hero.title}</h2>
        <p class="text-ink-soft leading-relaxed mb-6">${hero.dek || hero.excerpt || ''}</p>
        <div class="text-sm text-ink-mute">${hero.author} · ${formatDate(hero.published_at)}${hero.read_minutes ? ` · ${hero.read_minutes} min read` : ''}</div>
      </div>
    </a>` : ''}
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">${rest.map(PostCard).join('')}</div>
  </div>`
}

// ============================================================
// SINGLE POST — centered reading column
// ============================================================
export function PostPage(data: {
  post: Post
  faqs: { question: string; answer: string }[]
  deals: Deal[]
  related: Post[]
  sourcePath: string
}): string {
  const { post, faqs, deals, related, sourcePath } = data
  return `<article class="py-12">
    <div class="max-w-reading mx-auto px-5">
      ${Breadcrumbs([
        { name: 'Home', url: '/' },
        { name: post.pillar ? 'Guides' : 'Journal', url: post.pillar ? '/guides' : '/blog' },
        ...(post.category_name ? [{ name: post.category_name, url: `/category/${post.category_slug}` }] : []),
        { name: post.title },
      ])}
      <div class="eyebrow mb-5">${post.pillar ? 'Buying Guide' : post.category_name || 'Journal'}</div>
      <h1 class="font-serif text-4xl md:text-[3.25rem] leading-[1.06] text-ink">${post.title}</h1>
      ${post.dek || post.excerpt ? `<p class="mt-6 font-serif text-xl md:text-2xl italic text-ink-soft leading-relaxed">${post.dek || post.excerpt}</p>` : ''}
      <div class="mt-8 pb-8 border-b border-line flex items-center justify-between">
        ${Byline(post)}
        ${post.updated_at && post.updated_at !== post.published_at ? `<span class="text-xs text-ink-faint hidden sm:block">Updated ${timeAgo(post.updated_at)}</span>` : ''}
      </div>
    </div>

    ${post.cover_image ? `<div class="max-w-editorial mx-auto px-5 my-12"><img src="${post.cover_image}" alt="${post.title}" class="w-full rounded border border-line" /></div>` : '<div class="mt-12"></div>'}

    <div class="max-w-reading mx-auto px-5">
      ${deals.length ? AffiliateNotice() : ''}
      <div class="prose-area dropcap">${renderMarkdown(post.body)}</div>
    </div>

    ${deals.length ? `<div class="max-w-editorial mx-auto px-5">
      <section class="my-16 pt-16 border-t border-line">
        <div class="eyebrow mb-3">The shortlist</div>
        <h2 class="font-serif text-3xl text-ink mb-8">Our top picks, ranked</h2>
        ${ComparisonTable(deals, sourcePath)}
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">${deals.map((d, i) => DealCard(d, { rank: i + 1 })).join('')}</div>
      </section>
    </div>` : ''}

    <div class="max-w-reading mx-auto px-5">${FaqSection(faqs)}</div>
    ${NewsletterBox()}

    ${related.length ? `<div class="max-w-editorial mx-auto px-5">
      <section class="mt-12">
        ${SectionHeader('Keep reading', 'More from the Journal')}
        <div class="grid sm:grid-cols-2 gap-8">${related.map(PostCard).join('')}</div>
      </section>
    </div>` : ''}
  </article>`
}

// ============================================================
// SEARCH
// ============================================================
export function SearchPage(data: { q: string; deals: Deal[]; posts: Post[] }): string {
  const { q, deals, posts } = data
  const total = deals.length + posts.length
  return `<div class="max-w-editorial mx-auto px-5 py-16">
    ${Breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Search' }])}
    <header class="mb-14">
      <div class="eyebrow mb-3">Search</div>
      <h1 class="font-serif text-4xl text-ink">Results for "${q}"</h1>
      <p class="mt-3 text-ink-mute">${total} result${total === 1 ? '' : 's'} found.</p>
    </header>
    ${deals.length ? `<section class="mb-20">${SectionHeader('Products', 'Reviews')}${DealGrid(deals)}</section>` : ''}
    ${posts.length ? `<section>${SectionHeader('Articles', 'Journal')}<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">${posts.map(PostCard).join('')}</div></section>` : ''}
    ${!total ? `<div class="text-center py-24 text-ink-faint"><i class="fas fa-magnifying-glass text-3xl mb-4"></i><p>Nothing matched. Try another term.</p></div>` : ''}
  </div>`
}

// ============================================================
// STATIC / LEGAL — reading column
// ============================================================
export function StaticPage(data: { title: string; bodyMarkdown: string; crumbs: { name: string; url?: string }[] }): string {
  return `<div class="max-w-reading mx-auto px-5 py-16">
    ${Breadcrumbs(data.crumbs)}
    <header class="mb-12 pb-10 border-b border-line">
      <h1 class="font-serif text-4xl md:text-5xl text-ink leading-tight">${data.title}</h1>
    </header>
    <div class="prose-area">${renderMarkdown(data.bodyMarkdown)}</div>
  </div>`
}

// ============================================================
// 404
// ============================================================
export function NotFoundPage(): string {
  return `<div class="max-w-reading mx-auto px-5 py-28 text-center">
    <div class="font-serif text-8xl text-accent/30">404</div>
    <h1 class="font-serif text-4xl text-ink mt-6 mb-4">This page wandered off</h1>
    <p class="text-ink-soft mb-10 leading-relaxed">The page you're after doesn't exist or has moved. But there's plenty worth reading just a click away.</p>
    <div class="flex flex-wrap gap-3 justify-center">
      <a href="/" class="btn btn-primary">Return home</a>
      <a href="/guides" class="btn btn-ghost">Buying guides</a>
      <a href="/deals" class="btn btn-line">Browse deals</a>
    </div>
  </div>`
}
