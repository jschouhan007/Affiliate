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

  const fullTitle = title === SITE.name ? `${SITE.name} — ${SITE.tagline}` : `${title} · ${SITE.name}`
  const canonUrl = canonical ? (canonical.startsWith('http') ? canonical : `${SITE.url}${canonical}`) : SITE.url

  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script>
    (function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
  </script>
  <title>${fullTitle}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonUrl}" />
  ${noindex ? raw('<meta name="robots" content="noindex,follow" />') : raw('<meta name="robots" content="index,follow,max-image-preview:large" />')}
  <meta name="theme-color" content="#FCFBF9" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE.name}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonUrl}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />

  <link rel="icon" type="image/svg+xml" href="/static/logo.svg" />
  <link rel="alternate" type="application/rss+xml" title="${SITE.name}" href="/rss.xml" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,500;1,600&display=swap" rel="stylesheet" />

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            bg: '#FCFBF9', surface: '#FFFFFF', panel: '#F6F4F0',
            ink: { DEFAULT: '#1C1917', soft: '#44403C', mute: '#78716C', faint: '#A8A29E' },
            accent: { DEFAULT: '#9A3F2B', deep: '#7E3322', tint: '#F3E7E2', ink: '#5C2418' },
            line: { DEFAULT: '#E7E5E1', soft: '#EFEDE9' },
            star: '#B08A3E',
          },
          fontFamily: {
            serif: ['Playfair Display', 'Georgia', 'serif'],
            sans: ['Inter', 'system-ui', 'sans-serif'],
          },
          maxWidth: { editorial: '78rem', reading: '44rem' },
        }
      }
    }
  </script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="/static/style.css" rel="stylesheet" />
  ${raw(jsonLd.map((s) => `<script type="application/ld+json">${s}</script>`).join('\n'))}
</head>
<body class="min-h-screen flex flex-col">
  ${raw(TopBar())}
  ${raw(Header(categories))}
  <main class="flex-1">${raw(children)}</main>
  ${raw(Footer(categories))}
  ${raw(CookieBanner())}
  ${raw(CompareTray())}
  <script src="/static/app.js" defer></script>
</body>
</html>`
}

function ThemeToggle(): string {
  return `<button id="theme-toggle" class="theme-toggle" role="switch" aria-label="Toggle dark mode" title="Toggle theme">
    <i class="ico-sun fas fa-sun"></i>
    <i class="ico-moon fas fa-moon"></i>
    <span class="knob"><i class="fas fa-fire-flame-curved"></i></span>
  </button>`
}

function TopBar(): string {
  return `
  <div class="bg-ink text-bg/80 text-[0.72rem] tracking-[0.14em] uppercase font-medium">
    <div class="max-w-editorial mx-auto px-5 h-9 flex items-center justify-center gap-2">
      <i class="fas fa-vial-circle-check text-accent-tint"></i>
      <span>Independent &amp; reader-supported — we test before we recommend</span>
    </div>
  </div>`
}

function Header(categories: Category[]): string {
  const catLinks = categories
    .map(
      (c) =>
        `<a href="/category/${c.slug}" class="block px-3 py-2.5 text-ink-soft hover:text-accent hover:bg-panel rounded transition text-sm">
          <i class="${c.icon || 'fas fa-tag'} mr-2.5 text-ink-faint w-4 text-center"></i>${c.name}
        </a>`
    )
    .join('')

  return `
  <header class="sticky top-0 z-40 bg-bg/85 backdrop-blur-md border-b border-line">
    <div class="max-w-editorial mx-auto px-5">
      <div class="flex items-center justify-between h-[4.5rem] gap-6">
        <a href="/" class="flex items-center gap-2.5 group">
          <img src="/static/logo.svg" alt="DealSpot" class="w-8 h-8" />
          <span class="font-serif text-2xl font-bold tracking-tight text-ink">DealSpot</span>
        </a>
        <nav class="hidden md:flex items-center gap-7 text-[0.92rem] font-medium text-ink-soft">
          <a href="/deals" class="link-underline hover:text-ink">Deals</a>
          <div class="relative group">
            <button class="link-underline hover:text-ink flex items-center gap-1.5">Categories <i class="fas fa-chevron-down text-[0.6rem] mt-0.5 text-ink-faint"></i></button>
            <div class="absolute left-1/2 -translate-x-1/2 top-full pt-3 hidden group-hover:block">
              <div class="bg-surface shadow-[0_24px_60px_-30px_rgba(28,25,23,0.4)] rounded border border-line p-2 min-w-[230px]">${catLinks}</div>
            </div>
          </div>
          <a href="/best" class="link-underline hover:text-ink">Best Of</a>
          <a href="/guides" class="link-underline hover:text-ink">Buying Guides</a>
          <a href="/blog" class="link-underline hover:text-ink">Journal</a>
          <a href="/about" class="link-underline hover:text-ink">About</a>
        </nav>
        <div class="flex items-center gap-3">
          <form action="/search" method="get" class="hidden sm:flex items-center border-b border-line focus-within:border-ink transition pb-1">
            <i class="fas fa-search text-ink-faint text-xs"></i>
            <input type="text" name="q" placeholder="Search" class="bg-transparent outline-none text-sm px-2 w-24 lg:w-36 placeholder:text-ink-faint" />
          </form>
          ${ThemeToggle()}
          <button id="mobile-menu-btn" class="md:hidden p-2 text-ink" aria-label="Menu"><i class="fas fa-bars text-lg"></i></button>
        </div>
      </div>
    </div>
    <div id="mobile-menu" class="hidden md:hidden border-t border-line bg-surface px-5 py-4 space-y-1">
      <a href="/deals" class="block px-2 py-2 text-ink-soft hover:text-accent">Deals</a>
      <a href="/best" class="block px-2 py-2 text-ink-soft hover:text-accent">Best Of</a>
      <a href="/guides" class="block px-2 py-2 text-ink-soft hover:text-accent">Buying Guides</a>
      <a href="/blog" class="block px-2 py-2 text-ink-soft hover:text-accent">Journal</a>
      <a href="/about" class="block px-2 py-2 text-ink-soft hover:text-accent">About</a>
      <div class="pt-2 mt-2 border-t border-line-soft">${catLinks}</div>
      <form action="/search" method="get" class="flex items-center border border-line rounded px-3 py-2 mt-3">
        <i class="fas fa-search text-ink-faint text-sm"></i>
        <input type="text" name="q" placeholder="Search" class="bg-transparent outline-none text-sm px-2 flex-1" />
      </form>
    </div>
  </header>`
}

function Footer(categories: Category[]): string {
  const catLinks = categories
    .slice(0, 8)
    .map((c) => `<li><a href="/category/${c.slug}" class="text-ink-mute hover:text-accent transition">${c.name}</a></li>`)
    .join('')

  return `
  <footer class="mt-24 border-t border-line bg-panel">
    <div class="max-w-editorial mx-auto px-5 py-16">
      <div class="grid md:grid-cols-12 gap-10">
        <div class="md:col-span-4">
          <a href="/" class="flex items-center gap-2.5 mb-4">
            <img src="/static/logo.svg" alt="DealSpot" class="w-7 h-7" />
            <span class="font-serif text-xl font-bold text-ink">DealSpot</span>
          </a>
          <p class="text-ink-mute text-[0.95rem] leading-relaxed max-w-xs">An independent reviews publication. We research and test products, then recommend only what earns it — with the best current price.</p>
          <p class="mt-5 text-xs text-ink-faint leading-relaxed">As an Amazon Associate and Flipkart Affiliate, we earn from qualifying purchases. This never influences our verdicts.</p>
        </div>
        <div class="md:col-span-2 md:col-start-6">
          <h4 class="eyebrow eyebrow-mute mb-4">Categories</h4>
          <ul class="space-y-2.5 text-[0.95rem]">${catLinks}</ul>
        </div>
        <div class="md:col-span-2">
          <h4 class="eyebrow eyebrow-mute mb-4">Explore</h4>
          <ul class="space-y-2.5 text-[0.95rem]">
            <li><a href="/deals" class="text-ink-mute hover:text-accent transition">All Deals</a></li>
            <li><a href="/guides" class="text-ink-mute hover:text-accent transition">Buying Guides</a></li>
            <li><a href="/blog" class="text-ink-mute hover:text-accent transition">The Journal</a></li>
            <li><a href="/about" class="text-ink-mute hover:text-accent transition">About Us</a></li>
            <li><a href="/contact" class="text-ink-mute hover:text-accent transition">Contact</a></li>
          </ul>
        </div>
        <div class="md:col-span-2">
          <h4 class="eyebrow eyebrow-mute mb-4">Trust</h4>
          <ul class="space-y-2.5 text-[0.95rem]">
            <li><a href="/affiliate-disclosure" class="text-ink-mute hover:text-accent transition">Affiliate Disclosure</a></li>
            <li><a href="/privacy-policy" class="text-ink-mute hover:text-accent transition">Privacy Policy</a></li>
            <li><a href="/terms-of-service" class="text-ink-mute hover:text-accent transition">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div class="mt-14 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-faint">
        <span>© ${new Date().getFullYear()} ${SITE.name}. Independently owned.</span>
        <span>Prices &amp; availability are accurate as of the date indicated and subject to change.</span>
      </div>
    </div>
  </footer>`
}

function CompareTray(): string {
  return `
  <div id="compare-tray" class="compare-tray" role="region" aria-label="Comparison tray">
    <span class="eyebrow eyebrow-mute whitespace-nowrap hidden sm:inline">Compare</span>
    <div id="compare-thumbs" class="flex items-center gap-2"></div>
    <a id="compare-go" href="/compare" class="btn btn-primary btn-sm whitespace-nowrap">Compare <span id="compare-count">0</span> <i class="fas fa-arrow-right text-[0.7rem]"></i></a>
    <button type="button" id="compare-tray-clear" class="text-ink-faint hover:text-ink text-sm px-1" title="Clear">&times;</button>
  </div>`
}

function CookieBanner(): string {
  return `
  <div id="cookie-banner" class="fixed bottom-0 inset-x-0 z-50 hidden">
    <div class="max-w-3xl mx-auto m-4 bg-surface border border-line rounded shadow-[0_24px_60px_-30px_rgba(28,25,23,0.4)] p-5 flex flex-col sm:flex-row items-center gap-4">
      <p class="text-sm text-ink-soft flex-1 leading-relaxed">We use cookies for analytics to improve your reading experience. See our <a href="/privacy-policy" class="text-accent underline underline-offset-2">Privacy Policy</a>.</p>
      <div class="flex gap-2 shrink-0">
        <button id="cookie-decline" class="btn btn-line">Decline</button>
        <button id="cookie-accept" class="btn btn-primary">Accept</button>
      </div>
    </div>
  </div>`
}
