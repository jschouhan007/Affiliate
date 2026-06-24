import { html, raw } from 'hono/html'
import { SITE, type Category } from '../types'

interface LayoutOpts {
  title: string
  description?: string
  keywords?: string
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
    keywords,
    canonical,
    ogImage = `${SITE.url}/static/og-default.png`,
    jsonLd = [],
    categories = [],
    children,
    noindex = false,
  } = opts
  const ogImageUrl = ogImage && ogImage.startsWith('http') ? ogImage : `${SITE.url}${ogImage || '/static/og-default.png'}`

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
  ${keywords ? raw(`<meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}" />`) : ''}
  <link rel="canonical" href="${canonUrl}" />
  ${noindex ? raw('<meta name="robots" content="noindex,follow" />') : raw('<meta name="robots" content="index,follow,max-image-preview:large" />')}
  <meta name="theme-color" content="#FCFBF9" />
  <meta name="color-scheme" content="light dark" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE.name}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonUrl}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImageUrl}" />

  <link rel="icon" type="image/svg+xml" href="/static/logo.svg" />
  <link rel="alternate" type="application/rss+xml" title="${SITE.name}" href="/rss.xml" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,500;1,600&display=swap" rel="stylesheet" />

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    // Colors map to CSS variables so EVERY Tailwind utility (bg-*, text-*, border-*)
    // automatically follows the active [data-theme]. This is what makes dark mode work
    // site-wide — never hardcode theme hex values here.
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            // RGB-channel format ('r g b') so opacity modifiers like text-bg/80,
            // bg-surface/90, text-accent/30 work AND still follow [data-theme].
            bg: 'rgb(var(--bg-c) / <alpha-value>)',
            surface: 'rgb(var(--surface-c) / <alpha-value>)',
            panel: 'rgb(var(--surface-2-c) / <alpha-value>)',
            ink: {
              DEFAULT: 'rgb(var(--ink-c) / <alpha-value>)',
              soft: 'rgb(var(--ink-soft-c) / <alpha-value>)',
              mute: 'rgb(var(--ink-mute-c) / <alpha-value>)',
              faint: 'rgb(var(--ink-faint-c) / <alpha-value>)',
            },
            accent: {
              DEFAULT: 'rgb(var(--accent-c) / <alpha-value>)',
              deep: 'rgb(var(--accent-deep-c) / <alpha-value>)',
              tint: 'rgb(var(--accent-tint-c) / <alpha-value>)',
              ink: 'rgb(var(--accent-ink-c) / <alpha-value>)',
            },
            line: {
              DEFAULT: 'rgb(var(--line-c) / <alpha-value>)',
              soft: 'rgb(var(--line-soft-c) / <alpha-value>)',
              strong: 'rgb(var(--line-strong-c) / <alpha-value>)',
            },
            star: 'rgb(var(--star-c) / <alpha-value>)',
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
  <div class="topbar text-[0.72rem] tracking-[0.14em] uppercase font-medium">
    <div class="topbar__inner max-w-editorial mx-auto px-5 h-9 flex items-center justify-center gap-2">
      <i class="fas fa-vial-circle-check"></i>
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
  <header class="site-header sticky top-0 z-40">
    <div class="max-w-editorial mx-auto px-5">
      <div class="flex items-center justify-between h-[4.5rem] gap-4 lg:gap-6">
        <a href="/" class="flex items-center gap-2.5 group shrink-0">
          <img src="/static/logo.svg" alt="DealSpot" class="w-8 h-8 transition-transform duration-500 group-hover:rotate-[18deg] group-hover:scale-110" />
          <span class="font-serif text-2xl font-bold tracking-tight text-ink">DealSpot</span>
        </a>
        <nav class="hidden md:flex items-center gap-1 text-[0.92rem] font-medium">
          <a href="/deals" class="nav-link">Deals</a>
          <div class="relative nav-dropdown">
            <button class="nav-link flex items-center gap-1.5" aria-haspopup="true" aria-expanded="false">Categories <i class="fas fa-chevron-down text-[0.6rem] transition-transform duration-300 nav-caret"></i></button>
            <div class="nav-menu absolute left-1/2 -translate-x-1/2 top-full pt-3">
              <div class="bg-surface shadow-[0_24px_60px_-26px_rgba(0,0,0,0.45)] rounded-2xl border border-line p-2 min-w-[240px]">${catLinks}</div>
            </div>
          </div>
          <a href="/best" class="nav-link">Best Of</a>
          <a href="/guides" class="nav-link">Buying Guides</a>
          <a href="/blog" class="nav-link">Journal</a>
          <a href="/about" class="nav-link">About</a>
        </nav>
        <div class="flex items-center gap-2.5 shrink-0">
          <form action="/search" method="get" class="search-bar hidden sm:flex items-center" role="search">
            <i class="fas fa-search search-icon"></i>
            <input type="text" name="q" placeholder="Search reviews…" aria-label="Search" class="search-input" />
            <button type="submit" class="search-submit" aria-label="Submit search"><i class="fas fa-arrow-right"></i></button>
          </form>
          ${ThemeToggle()}
          <button id="mobile-menu-btn" class="mobile-burger md:hidden" aria-label="Menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </div>
    <div id="mobile-menu" class="mobile-menu md:hidden">
      <div class="px-5 py-4 space-y-1">
        <a href="/deals" class="mobile-link">Deals</a>
        <a href="/best" class="mobile-link">Best Of</a>
        <a href="/guides" class="mobile-link">Buying Guides</a>
        <a href="/blog" class="mobile-link">Journal</a>
        <a href="/about" class="mobile-link">About</a>
        <details class="mobile-cats">
          <summary class="mobile-link flex items-center justify-between cursor-pointer">Categories <i class="fas fa-chevron-down text-[0.7rem] transition-transform"></i></summary>
          <div class="pt-1 pl-1">${catLinks}</div>
        </details>
        <form action="/search" method="get" class="search-bar search-bar--mobile flex items-center mt-3" role="search">
          <i class="fas fa-search search-icon"></i>
          <input type="text" name="q" placeholder="Search reviews…" aria-label="Search" class="search-input flex-1" />
          <button type="submit" class="search-submit" aria-label="Submit search"><i class="fas fa-arrow-right"></i></button>
        </form>
      </div>
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
