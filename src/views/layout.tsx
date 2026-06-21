import { html, raw } from 'hono/html'
import { SITE, type Category } from '../types'

interface LayoutOpts {
  title: string
  description?: string
  canonical?: string
  ogImage?: string
  jsonLd?: string[]
  categories?: Category[]
  children: string
  noindex?: boolean
}

export function Layout(opts: LayoutOpts) {
  const {
    title,
    description = SITE.description,
    canonical,
    ogImage = `${SITE.url}/static/og-default.png`,
    jsonLd = [],
    categories = [],
    children,
    noindex = false,
  } = opts

  const fullTitle = title === SITE.name ? `${SITE.name} — ${SITE.tagline}` : `${title} | ${SITE.name}`
  const canonUrl = canonical ? (canonical.startsWith('http') ? canonical : `${SITE.url}${canonical}`) : SITE.url

  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fullTitle}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonUrl}" />
  ${noindex ? raw('<meta name="robots" content="noindex,follow" />') : raw('<meta name="robots" content="index,follow,max-image-preview:large" />')}

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE.name}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonUrl}" />
  <meta property="og:image" content="${ogImage}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />

  <link rel="icon" type="image/svg+xml" href="/static/logo.svg" />
  <link rel="alternate" type="application/rss+xml" title="${SITE.name}" href="/rss.xml" />

  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="/static/style.css" rel="stylesheet" />
  ${raw(
    jsonLd
      .map((s) => `<script type="application/ld+json">${s}</script>`)
      .join('\n')
  )}
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col">
  ${raw(Header(categories))}
  <main class="flex-1">${raw(children)}</main>
  ${raw(Footer(categories))}
  ${raw(CookieBanner())}
  <script src="/static/app.js" defer></script>
</body>
</html>`
}

function Header(categories: Category[]): string {
  const catLinks = categories
    .map(
      (c) =>
        `<a href="/category/${c.slug}" class="block px-4 py-2 hover:bg-slate-100 rounded-lg whitespace-nowrap"><i class="${c.icon || 'fas fa-tag'} mr-2 text-indigo-500"></i>${c.name}</a>`
    )
    .join('')

  return `
  <header class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex items-center justify-between h-16 gap-4">
        <a href="/" class="flex items-center gap-2 font-extrabold text-xl text-slate-900">
          <img src="/static/logo.svg" alt="DealSpot" class="w-8 h-8" />
          <span>Deal<span class="text-indigo-600">Spot</span></span>
        </a>
        <nav class="hidden md:flex items-center gap-1 text-sm font-medium">
          <a href="/deals" class="px-3 py-2 hover:text-indigo-600">Deals</a>
          <div class="relative group">
            <button class="px-3 py-2 hover:text-indigo-600">Categories <i class="fas fa-chevron-down text-xs ml-1"></i></button>
            <div class="absolute left-0 top-full hidden group-hover:block bg-white shadow-xl rounded-xl border border-slate-100 p-2 min-w-[220px]">
              ${catLinks}
            </div>
          </div>
          <a href="/blog" class="px-3 py-2 hover:text-indigo-600">Blog</a>
          <a href="/guides" class="px-3 py-2 hover:text-indigo-600">Buying Guides</a>
        </nav>
        <div class="flex items-center gap-2">
          <form action="/search" method="get" class="hidden sm:flex items-center bg-slate-100 rounded-full px-3 py-1.5">
            <i class="fas fa-search text-slate-400 text-sm"></i>
            <input type="text" name="q" placeholder="Search deals…" class="bg-transparent outline-none text-sm px-2 w-32 lg:w-48" />
          </form>
          <button id="mobile-menu-btn" class="md:hidden p-2 text-slate-600" aria-label="Menu"><i class="fas fa-bars text-xl"></i></button>
        </div>
      </div>
    </div>
    <div id="mobile-menu" class="hidden md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
      <a href="/deals" class="block px-2 py-2 rounded hover:bg-slate-100">Deals</a>
      <a href="/blog" class="block px-2 py-2 rounded hover:bg-slate-100">Blog</a>
      <a href="/guides" class="block px-2 py-2 rounded hover:bg-slate-100">Buying Guides</a>
      <div class="pt-2 border-t border-slate-100">${catLinks}</div>
      <form action="/search" method="get" class="flex items-center bg-slate-100 rounded-full px-3 py-2 mt-2">
        <i class="fas fa-search text-slate-400 text-sm"></i>
        <input type="text" name="q" placeholder="Search deals…" class="bg-transparent outline-none text-sm px-2 flex-1" />
      </form>
    </div>
  </header>`
}

function Footer(categories: Category[]): string {
  const catLinks = categories
    .slice(0, 8)
    .map((c) => `<li><a href="/category/${c.slug}" class="hover:text-white">${c.name}</a></li>`)
    .join('')

  return `
  <footer class="bg-slate-900 text-slate-400 mt-16">
    <div class="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
      <div class="col-span-2 md:col-span-1">
        <div class="flex items-center gap-2 font-extrabold text-lg text-white mb-3">
          <img src="/static/logo.svg" alt="DealSpot" class="w-7 h-7" />
          Deal<span class="text-indigo-400">Spot</span>
        </div>
        <p class="text-slate-400 leading-relaxed">${SITE.tagline}.</p>
        <p class="mt-3 text-xs text-slate-500">As an Amazon Associate and Flipkart Affiliate, we earn from qualifying purchases.</p>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Categories</h4>
        <ul class="space-y-2">${catLinks}</ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Explore</h4>
        <ul class="space-y-2">
          <li><a href="/deals" class="hover:text-white">All Deals</a></li>
          <li><a href="/blog" class="hover:text-white">Blog</a></li>
          <li><a href="/guides" class="hover:text-white">Buying Guides</a></li>
          <li><a href="/about" class="hover:text-white">About</a></li>
          <li><a href="/contact" class="hover:text-white">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Legal</h4>
        <ul class="space-y-2">
          <li><a href="/affiliate-disclosure" class="hover:text-white">Affiliate Disclosure</a></li>
          <li><a href="/privacy-policy" class="hover:text-white">Privacy Policy</a></li>
          <li><a href="/terms-of-service" class="hover:text-white">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-slate-800 py-5 text-center text-xs text-slate-500">
      © ${new Date().getFullYear()} ${SITE.name}. All trademarks belong to their respective owners. Prices and availability are accurate as of the date/time indicated and are subject to change.
    </div>
  </footer>`
}

function CookieBanner(): string {
  return `
  <div id="cookie-banner" class="fixed bottom-0 inset-x-0 z-50 hidden">
    <div class="max-w-4xl mx-auto m-4 bg-white shadow-2xl border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
      <p class="text-sm text-slate-600 flex-1">We use cookies for analytics to improve your experience. By using this site you agree to our <a href="/privacy-policy" class="text-indigo-600 underline">Privacy Policy</a>.</p>
      <div class="flex gap-2">
        <button id="cookie-decline" class="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">Decline</button>
        <button id="cookie-accept" class="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Accept</button>
      </div>
    </div>
  </div>`
}
