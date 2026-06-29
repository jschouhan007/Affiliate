// ============================================================
// Outbound link handling: mobile deep linking + first-party attribution
// ------------------------------------------------------------
// Affiliate clicks convert far better when a mobile user lands directly inside
// the retailer's NATIVE app (logged-in, 1-tap checkout) instead of a mobile
// browser. This module:
//   1. detects the device from the User-Agent,
//   2. builds the best app deep link for known retailers (Amazon, Flipkart),
//   3. preserves first-party attribution (UTM + landing page) onto the
//      outbound URL so the retailer/affiliate network — and our own click log —
//      know which campaign/article drove the visit.
// The actual "open app, fall back to web" handoff is done by a tiny HTML
// auto-redirect page (see buildAutoRedirect) because a raw 302 to a custom scheme
// dead-ends when the app isn't installed.
// ============================================================

export type Device = 'ios' | 'android' | 'desktop'

export function detectDevice(ua: string): Device {
  const s = (ua || '').toLowerCase()
  if (/iphone|ipad|ipod/.test(s)) return 'ios'
  // iPadOS 13+ reports as Mac; treat touch Macs conservatively as desktop.
  if (/android/.test(s)) return 'android'
  return 'desktop'
}

export function isMobile(device: Device): boolean {
  return device === 'ios' || device === 'android'
}

// ---- First-party attribution -------------------------------------------------
// We persist UTM params + the landing page in a first-party cookie (set by
// app.js on the very first visit). On an outbound click we read them back and
// append them to the destination URL so attribution survives the hop.
export interface Attribution {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  landing?: string // first page the user landed on
  from?: string // the article/page the outbound click happened on
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

// Parse our first-party attribution cookie (URL-encoded querystring form).
export function parseAttributionCookie(raw: string | undefined | null): Attribution {
  const out: Attribution = {}
  if (!raw) return out
  try {
    const params = new URLSearchParams(decodeURIComponent(raw))
    for (const k of UTM_KEYS) {
      const v = params.get(k)
      if (v) (out as any)[k] = v
    }
    const landing = params.get('landing')
    if (landing) out.landing = landing
  } catch {
    /* ignore malformed cookie */
  }
  return out
}

// Append our UTM attribution to an outbound retailer URL WITHOUT clobbering the
// affiliate tag the retailer already requires (e.g. Amazon ?tag=). We only add
// utm_* keys that aren't already present.
export function appendAttribution(destUrl: string, attr: Attribution): string {
  try {
    const u = new URL(destUrl)
    for (const k of UTM_KEYS) {
      const v = (attr as any)[k]
      if (v && !u.searchParams.has(k)) u.searchParams.set(k, v)
    }
    return u.toString()
  } catch {
    return destUrl // non-absolute / odd URL — leave untouched
  }
}

// ---- Retailer detection ------------------------------------------------------
export type Retailer = 'amazon' | 'flipkart' | 'myntra' | 'ajio' | 'other'

export function detectRetailer(destUrl: string, hint?: string): Retailer {
  const h = (hint || '').toLowerCase()
  if (h === 'amazon' || h === 'flipkart' || h === 'myntra' || h === 'ajio') return h
  const host = (() => {
    try {
      return new URL(destUrl).hostname.toLowerCase()
    } catch {
      return ''
    }
  })()
  if (/amazon\.|amzn\./.test(host)) return 'amazon'
  if (/flipkart\.|fkrt\./.test(host)) return 'flipkart'
  if (/myntra\./.test(host)) return 'myntra'
  if (/ajio\./.test(host)) return 'ajio'
  return 'other'
}

// Known retailer Android package names + iOS custom URL schemes.
const RETAILER_ANDROID_PKG: Record<Retailer, string | undefined> = {
  amazon: 'com.amazon.mShop.android.shopping',
  flipkart: 'com.flipkart.android',
  myntra: 'com.myntra.android',
  ajio: 'com.ril.ajio',
  other: undefined,
}

// iOS custom URL schemes. These dead-end (show "address invalid") if the app
// isn't installed, so on iOS we ALWAYS run a JS timer fallback to the web URL.
const RETAILER_IOS_SCHEME: Record<Retailer, string | undefined> = {
  // Amazon's app handles its https universal links AND a custom scheme. The
  // custom scheme form that reliably opens a product is the shopping web scheme
  // pointing at the full https URL (host included).
  amazon: 'com.amazon.mobile.shopping.web://',
  flipkart: 'flipkart://',
  myntra: 'myntra://',
  ajio: undefined,
  other: undefined,
}

// ---- Deep-link builders ------------------------------------------------------
// Returns { app, web } where `app` is the native-app deep link (an android
// intent:// URL OR an iOS custom scheme) and `web` is the safe https fallback.
//
// IMPORTANT design note (the bug we are fixing):
//   * On ANDROID we hand back an intent:// URL. Android/Chrome handles the
//     "open app, else go to browser_fallback_url" logic NATIVELY. The
//     interstitial therefore must NOT run a JS timer that races the OS — doing
//     so was forcing the web version even when the app was opening. We flag
//     android links so the interstitial knows to skip the JS fallback.
//   * On iOS, custom schemes dead-end silently when the app is missing, so the
//     interstitial DOES need a JS timer fallback to the web URL.
export function buildDeepLinks(
  destUrl: string,
  retailer: Retailer,
  device: Device
): { app?: string; web: string; isAndroidIntent?: boolean; intent?: string } {
  const web = destUrl
  if (device === 'desktop') return { web }

  if (device === 'android') {
    const pkg = RETAILER_ANDROID_PKG[retailer]
    if (!pkg) return { web }
    // THE FIX (Brave/Chrome inversion):
    //   * "Open in app" must use an intent:// WITHOUT S.browser_fallback_url.
    //     With a fallback baked in, Brave ignores the app and silently follows
    //     the fallback → the website (that was the bug: "Open in app" → website).
    //     Strip the fallback and Brave has nowhere to divert to, so it launches
    //     the installed app. If the app isn't installed it throws (browser shows
    //     an error) — so the interstitial runs a JS timer that sends the user to
    //     the WEBSITE only if the app clearly didn't take over.
    //   * `app` (the plain https App Link) is kept ONLY as a last-resort booster
    //     for vanilla Chrome; the no-fallback intent is the primary launcher.
    return {
      app: destUrl,
      web,
      isAndroidIntent: true,
      intent: toAndroidIntent(destUrl, pkg),
    }
  }

  // iOS
  const scheme = RETAILER_IOS_SCHEME[retailer]
  if (!scheme) return { web }
  return { app: destUrl.replace(/^https?:\/\//, scheme), web, isAndroidIntent: false }
}

// Build an Android intent:// URL with a browser fallback baked in. If the app
// isn't installed, Chrome follows S.browser_fallback_url back to the web URL.
// We strip the https:// scheme from the host portion and declare scheme=https
// inside the intent so Android matches the retailer's verified App Link filter.
function toAndroidIntent(httpsUrl: string, pkg: string): string {
  const rest = httpsUrl.replace(/^https?:\/\//, '')
  // NO S.browser_fallback_url on purpose. A fallback makes Brave skip the app
  // and follow the fallback straight to the website. Without it, Brave must
  // launch the installed app (or throw ActivityNotFoundException if it's not
  // installed — which the interstitial's JS timer handles by going to the web).
  return `intent://${rest}#Intent;scheme=https;package=${pkg};end`
}

// ---- Auto-redirect (no interstitial screen) ---------------------------------
// The user explicitly does NOT want any "Open in app / Continue in browser"
// screen or 5-second countdown. Tapping a Buy link must go straight to the
// retailer: open the NATIVE APP if installed, otherwise open the WEBSITE in the
// mobile browser — automatically, with no choice prompt.
//
// How we achieve "app if installed, else website" with zero UI:
//   * ANDROID — fire an intent:// WITHOUT S.browser_fallback_url. On Brave a
//     fallback makes the browser skip the app and jump to the website, so we
//     omit it. The OS launches the installed app. If the app is NOT installed
//     the intent does nothing and we stay on this page — a short JS timer then
//     auto-navigates to the WEBSITE. The page itself is invisible (a tiny
//     spinner only), so the user just sees the app open or the site load.
//   * iOS — fire the custom app scheme; if the app doesn't take over within a
//     grace period, auto-navigate to the website.
// No buttons, no countdown, no second tap.
export function buildAutoRedirect(
  app: string | undefined,
  web: string,
  retailerName: string,
  isAndroidIntent: boolean = false,
  intent?: string
): string {
  const display = retailerName.replace(/</g, '&lt;')

  // No app deep link (desktop / unknown retailer) — just go to the web URL.
  if (!app) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Opening ${display}…</title>
<script>(function(){window.location.replace(${JSON.stringify(web)});})();</script>
</head><body></body></html>`
  }

  const isAndroid = isAndroidIntent
  // Primary "open the app" navigation target.
  const appTarget = isAndroid && intent ? intent : app

  // The whole handoff: fire the app link immediately, then auto-fall back to the
  // website if the app didn't take over (i.e. it isn't installed).
  const handoff = `
    var web = ${JSON.stringify(web)};
    var appTarget = ${JSON.stringify(appTarget)};
    var t0 = Date.now();
    var hidden = false;
    document.addEventListener('visibilitychange', function(){ if (document.hidden) hidden = true; });
    function goWeb(){ try { window.location.replace(web); } catch (e) {} }
    // Fire the native-app link straight away.
    try { window.location.href = appTarget; } catch (e) { goWeb(); }
    // If the app opened, the page goes to the background (hidden) and/or JS is
    // suspended; in that case do NOT redirect. Otherwise (app not installed),
    // send the user to the website automatically.
    setTimeout(function(){
      if (document.hidden || hidden) return;     // app took over
      if (Date.now() - t0 > 1600) return;        // JS was suspended -> app opened
      goWeb();
    }, ${isAndroid ? 1200 : 1500});`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Opening ${display}…</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#14100E;color:#EDE3D2;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
  .box{padding:2rem}
  .spin{width:34px;height:34px;border:3px solid rgba(255,255,255,.25);border-top-color:#E5A23D;border-radius:50%;animation:s .8s linear infinite;margin:0 auto 1rem}
  @keyframes s{to{transform:rotate(360deg)}}
  p{opacity:.8;font-size:.95rem;margin:0}
</style></head>
<body>
  <div class="box"><div class="spin"></div><p>Opening ${display}…</p></div>
  <script>(function(){${handoff}})();</script>
</body></html>`
}

export function retailerDisplayName(r: Retailer): string {
  return { amazon: 'Amazon', flipkart: 'Flipkart', myntra: 'Myntra', ajio: 'AJIO', other: 'the store' }[r]
}
