import { raw } from 'hono/html'
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
} from './components'

// ---------------- Home ----------------
export function HomePage(data: {
  categories: Category[]
  featured: Deal[]
  latestDeals: Deal[]
  pillars: Post[]
  posts: Post[]
}): string {
  const { categories, featured, latestDeals, pillars, posts } = data
  const catChips = categories
    .map(
      (c) =>
        `<a href="/category/${c.slug}" class="flex flex-col items-center gap-2 bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md hover:border-indigo-200 transition text-center">
          <span class="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-xl"><i class="${c.icon || 'fas fa-tag'}"></i></span>
          <span class="text-sm font-medium text-slate-700">${c.name}</span>
        </a>`
    )
    .join('')

  return `
  <section class="bg-gradient-to-b from-indigo-600 to-violet-700 text-white">
    <div class="max-w-6xl mx-auto px-4 py-14 md:py-20 text-center">
      <h1 class="text-3xl md:text-5xl font-extrabold leading-tight">The best deals on the internet,<br class="hidden md:block" /> hand-picked & verified.</h1>
      <p class="mt-4 text-indigo-100 max-w-2xl mx-auto text-lg">We hunt across Amazon, Flipkart and more for genuine discounts on mobiles, tech, appliances, home & outdoor gear — then tell you honestly if they're worth it.</p>
      <form action="/search" method="get" class="mt-8 max-w-xl mx-auto flex bg-white rounded-2xl p-1.5 shadow-lg">
        <input type="text" name="q" placeholder="Search for a product or deal…" class="flex-1 px-4 py-3 text-slate-800 outline-none rounded-xl" />
        <button class="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700"><i class="fas fa-search mr-1"></i>Search</button>
      </form>
    </div>
  </section>

  <div class="max-w-6xl mx-auto px-4 py-10 space-y-14">
    <section>
      ${SectionHeader('Shop by Category', 'Find deals in the category that matters to you')}
      <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">${catChips}</div>
    </section>

    ${featured.length ? `<section>
      ${SectionHeader("Today's Top Picks", "Our editors' favourite deals right now", { text: 'All deals', href: '/deals' })}
      ${DealGrid(featured)}
    </section>` : ''}

    ${pillars.length ? `<section>
      ${SectionHeader('Buying Guides', 'In-depth "best of" roundups to help you choose', { text: 'All guides', href: '/guides' })}
      <div class="grid md:grid-cols-3 gap-5">${pillars.map(PostCard).join('')}</div>
    </section>` : ''}

    ${latestDeals.length ? `<section>
      ${SectionHeader('Latest Deals', 'Freshly added & price-checked', { text: 'See more', href: '/deals' })}
      ${DealGrid(latestDeals)}
    </section>` : ''}

    ${NewsletterBox()}

    ${posts.length ? `<section>
      ${SectionHeader('From the Blog', 'Tips, comparisons and how-tos', { text: 'Read the blog', href: '/blog' })}
      <div class="grid md:grid-cols-3 gap-5">${posts.map(PostCard).join('')}</div>
    </section>` : ''}
  </div>`
}

// ---------------- Deals listing ----------------
export function DealsPage(data: { deals: Deal[]; title: string; subtitle?: string; crumbs: { name: string; url?: string }[] }): string {
  return `<div class="max-w-6xl mx-auto px-4 py-8">
    ${Breadcrumbs(data.crumbs)}
    <h1 class="text-3xl font-bold mb-1">${data.title}</h1>
    ${data.subtitle ? `<p class="text-slate-500 mb-6">${data.subtitle}</p>` : '<div class="mb-6"></div>'}
    ${DealGrid(data.deals)}
  </div>`
}

// ---------------- Category ----------------
export function CategoryPage(data: { category: Category; deals: Deal[]; pillars: Post[] }): string {
  const { category, deals, pillars } = data
  return `<div class="max-w-6xl mx-auto px-4 py-8">
    ${Breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Categories', url: '/deals' }, { name: category.name }])}
    <div class="flex items-center gap-3 mb-2">
      <span class="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-2xl"><i class="${category.icon || 'fas fa-tag'}"></i></span>
      <h1 class="text-3xl font-bold">${category.name} Deals</h1>
    </div>
    <p class="text-slate-500 mb-6">${category.description || `The best ${category.name.toLowerCase()} deals from Amazon, Flipkart and more.`}</p>
    ${pillars.length ? `<section class="mb-10">
      ${SectionHeader('Buying Guides', `Best ${category.name.toLowerCase()} roundups`)}
      <div class="grid md:grid-cols-3 gap-5">${pillars.map(PostCard).join('')}</div>
    </section>` : ''}
    ${SectionHeader('All ' + category.name + ' Deals')}
    ${DealGrid(deals)}
  </div>`
}

// ---------------- Single review (money page) ----------------
export function ReviewPage(data: {
  deal: Deal
  faqs: { question: string; answer: string }[]
  related: Deal[]
  sourcePath: string
}): string {
  const { deal, faqs, related, sourcePath } = data
  const cheapest = (deal.offers || []).filter((o) => o.price != null).sort((a, b) => (a.price as number) - (b.price as number))[0]
  const disc = cheapest ? discountPct(cheapest.price, cheapest.original_price) : null

  return `<div class="max-w-5xl mx-auto px-4 py-8">
    ${Breadcrumbs([
      { name: 'Home', url: '/' },
      ...(deal.category_name ? [{ name: deal.category_name, url: `/category/${deal.category_slug}` }] : []),
      { name: deal.title },
    ])}
    ${AffiliateNotice()}
    <div class="grid md:grid-cols-2 gap-8">
      <div class="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-center aspect-square">
        ${deal.image_url ? `<img src="${deal.image_url}" alt="${deal.title}" class="max-h-full object-contain" />` : `<i class="fas fa-box-open text-6xl text-slate-200"></i>`}
      </div>
      <div>
        ${deal.brand ? `<div class="text-sm font-medium text-indigo-500 mb-1">${deal.brand}</div>` : ''}
        <h1 class="text-2xl md:text-3xl font-bold leading-tight">${deal.title}</h1>
        ${deal.rating ? `<div class="mt-2 text-amber-400">${'★'.repeat(Math.round(deal.rating))}<span class="text-slate-500 text-sm ml-2">${deal.rating.toFixed(1)} / 5 — our verdict</span></div>` : ''}
        ${deal.short_desc ? `<p class="mt-3 text-slate-600 leading-relaxed">${deal.short_desc}</p>` : ''}
        ${cheapest ? `<div class="mt-4 flex items-baseline gap-3">
          <span class="text-3xl font-extrabold text-slate-900">${formatPrice(cheapest.price, cheapest.currency)}</span>
          ${cheapest.original_price && disc ? `<span class="text-lg line-through text-slate-400">${formatPrice(cheapest.original_price, cheapest.currency)}</span><span class="bg-rose-100 text-rose-600 text-sm font-bold px-2 py-0.5 rounded">${disc}% OFF</span>` : ''}
        </div>` : ''}
        <div class="mt-5">${PriceBox(deal, sourcePath)}</div>
      </div>
    </div>

    ${ProsCons(deal)}

    ${deal.description ? `<section class="prose-area max-w-none mt-8">
      <h2 class="text-2xl font-bold mb-2">Our Review</h2>
      ${renderMarkdown(deal.description)}
    </section>` : ''}

    ${FaqSection(faqs)}

    ${related.length ? `<section class="mt-12">
      ${SectionHeader('You might also like')}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">${related.map(DealCard).join('')}</div>
    </section>` : ''}

    ${NewsletterBox()}
  </div>`
}

// ---------------- Blog index ----------------
export function BlogIndexPage(data: { posts: Post[]; title: string; subtitle: string; crumbs: { name: string; url?: string }[] }): string {
  const [hero, ...rest] = data.posts
  return `<div class="max-w-6xl mx-auto px-4 py-8">
    ${Breadcrumbs(data.crumbs)}
    <h1 class="text-3xl font-bold mb-1">${data.title}</h1>
    <p class="text-slate-500 mb-8">${data.subtitle}</p>
    ${!data.posts.length ? '<p class="text-slate-400 py-12 text-center">No posts published yet.</p>' : ''}
    ${hero ? `<a href="/blog/${hero.slug}" class="group grid md:grid-cols-2 gap-6 bg-white rounded-3xl border border-slate-100 overflow-hidden mb-10 hover:shadow-lg transition">
      <div class="aspect-[16/10] md:aspect-auto bg-slate-100 overflow-hidden">${hero.cover_image ? `<img src="${hero.cover_image}" alt="${hero.title}" class="w-full h-full object-cover group-hover:scale-105 transition" />` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="fas fa-newspaper text-5xl"></i></div>`}</div>
      <div class="p-6 md:p-8 flex flex-col justify-center">
        ${hero.category_name ? `<span class="text-xs font-medium text-indigo-500 mb-2">${hero.category_name}</span>` : ''}
        <h2 class="text-2xl font-bold mb-2 group-hover:text-indigo-600">${hero.title}</h2>
        <p class="text-slate-500 mb-4">${hero.excerpt || ''}</p>
        <span class="text-xs text-slate-400">${formatDate(hero.published_at)}</span>
      </div>
    </a>` : ''}
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">${rest.map(PostCard).join('')}</div>
  </div>`
}

// ---------------- Single blog post ----------------
export function PostPage(data: {
  post: Post
  faqs: { question: string; answer: string }[]
  deals: Deal[]
  related: Post[]
  sourcePath: string
}): string {
  const { post, faqs, deals, related, sourcePath } = data
  return `<article class="max-w-3xl mx-auto px-4 py-8">
    ${Breadcrumbs([
      { name: 'Home', url: '/' },
      { name: post.pillar ? 'Guides' : 'Blog', url: post.pillar ? '/guides' : '/blog' },
      ...(post.category_name ? [{ name: post.category_name, url: `/category/${post.category_slug}` }] : []),
      { name: post.title },
    ])}
    ${post.category_name ? `<a href="/category/${post.category_slug}" class="text-sm font-medium text-indigo-500">${post.category_name}${post.pillar ? ' · Buying Guide' : ''}</a>` : ''}
    <h1 class="text-3xl md:text-4xl font-extrabold leading-tight mt-1 mb-3">${post.title}</h1>
    <div class="flex items-center gap-3 text-sm text-slate-400 mb-6">
      <span><i class="fas fa-user-pen mr-1"></i>${post.author}</span>
      <span>·</span>
      <span><i class="fas fa-calendar mr-1"></i>${formatDate(post.published_at)}</span>
      ${post.updated_at && post.updated_at !== post.published_at ? `<span>·</span><span>Updated ${timeAgo(post.updated_at)}</span>` : ''}
    </div>
    ${post.cover_image ? `<img src="${post.cover_image}" alt="${post.title}" class="w-full rounded-2xl mb-8" />` : ''}
    ${deals.length ? AffiliateNotice() : ''}

    <div class="prose-area">${renderMarkdown(post.body)}</div>

    ${deals.length ? `<section class="my-10">
      <h2 class="text-2xl font-bold mb-4">Our Top Picks</h2>
      ${ComparisonTable(deals, sourcePath)}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">${deals.map(DealCard).join('')}</div>
    </section>` : ''}

    ${FaqSection(faqs)}
    ${NewsletterBox()}

    ${related.length ? `<section class="mt-12">
      ${SectionHeader('Related reading')}
      <div class="grid sm:grid-cols-2 gap-5">${related.map(PostCard).join('')}</div>
    </section>` : ''}
  </article>`
}

// ---------------- Search ----------------
export function SearchPage(data: { q: string; deals: Deal[]; posts: Post[] }): string {
  const { q, deals, posts } = data
  const total = deals.length + posts.length
  return `<div class="max-w-6xl mx-auto px-4 py-8">
    ${Breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Search' }])}
    <h1 class="text-2xl font-bold mb-1">Search results for “${q}”</h1>
    <p class="text-slate-500 mb-8">${total} result${total === 1 ? '' : 's'} found.</p>
    ${deals.length ? `<section class="mb-10">${SectionHeader('Products & Deals')}${DealGrid(deals)}</section>` : ''}
    ${posts.length ? `<section>${SectionHeader('Articles')}<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">${posts.map(PostCard).join('')}</div></section>` : ''}
    ${!total ? `<div class="text-center py-16 text-slate-400"><i class="fas fa-magnifying-glass text-4xl mb-3"></i><p>No results. Try a different keyword.</p></div>` : ''}
  </div>`
}

// ---------------- Static / legal ----------------
export function StaticPage(data: { title: string; bodyMarkdown: string; crumbs: { name: string; url?: string }[] }): string {
  return `<div class="max-w-3xl mx-auto px-4 py-10">
    ${Breadcrumbs(data.crumbs)}
    <h1 class="text-3xl font-bold mb-6">${data.title}</h1>
    <div class="prose-area">${renderMarkdown(data.bodyMarkdown)}</div>
  </div>`
}

// ---------------- 404 ----------------
export function NotFoundPage(): string {
  return `<div class="max-w-xl mx-auto px-4 py-24 text-center">
    <div class="text-7xl font-extrabold text-indigo-200">404</div>
    <h1 class="text-2xl font-bold mt-4 mb-2">Page not found</h1>
    <p class="text-slate-500 mb-8">The page you're looking for doesn't exist or has moved. But there are plenty of great deals waiting for you.</p>
    <div class="flex flex-wrap gap-3 justify-center">
      <a href="/" class="bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700">Go Home</a>
      <a href="/deals" class="border border-slate-300 px-5 py-2.5 rounded-xl hover:bg-slate-50">Browse Deals</a>
      <a href="/blog" class="border border-slate-300 px-5 py-2.5 rounded-xl hover:bg-slate-50">Read the Blog</a>
    </div>
  </div>`
}
