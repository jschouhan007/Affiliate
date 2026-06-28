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
// interstitial (see buildInterstitial) because a raw 302 to a custom scheme
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
): { app?: string; web: string; isAndroidIntent?: boolean } {
  const web = destUrl
  if (device === 'desktop') return { web }

  if (device === 'android') {
    const pkg = RETAILER_ANDROID_PKG[retailer]
    if (!pkg) return { web }
    return { app: toAndroidIntent(destUrl, pkg), web, isAndroidIntent: true }
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
  const fallback = encodeURIComponent(httpsUrl)
  return `intent://${rest}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${fallback};end`
}

// ---- Interstitial ------------------------------------------------------------
// A minimal, instant HTML page that attempts the app deep link then falls back
// to the web URL. Kept tiny (inline, no external assets) so TTFB stays low and
// the handoff feels instant. noindex so it never gets crawled/indexed.
//
// Two distinct strategies (this is the core of the deep-link fix):
//   * ANDROID intent:// — navigate to the intent and DO NOTHING else. Android
//     itself opens the app if installed, or follows S.browser_fallback_url to
//     the web URL if not. Any JS timer would race the OS and wrongly force the
//     web version while the app is still launching, which is exactly the bug
//     the user reported. So for Android we run NO fallback timer at all.
//   * iOS custom scheme — the scheme dead-ends silently if the app is missing,
//     so we DO need a JS timer: try the scheme, and if we're still visible after
//     a grace period (app didn't take over), go to the web URL.
export function buildInterstitial(
  app: string | undefined,
  web: string,
  retailerName: string,
  isAndroidIntent: boolean = false
): string {
  const safeWeb = web.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const safeApp = (app || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const display = retailerName.replace(/</g, '&lt;')

  // Build the device-appropriate handoff script.
  let handoff: string
  if (!app) {
    handoff = `window.location.replace(${JSON.stringify(web)});`
  } else if (isAndroidIntent) {
    // ANDROID — the reported bug: the app didn't open (esp. in Brave / non-Chrome
    // browsers) and the user landed on the web version.
    //
    // Root cause: many Android browsers (Brave, Firefox, in-app webviews) BLOCK
    // an automatic, script-initiated navigation to an `intent://` URL. They only
    // honour it from a real user gesture (a tap). Chrome auto-launches it, but
    // others don't — so a pure auto-redirect silently fell through to the web.
    //
    // Fix — try BOTH paths, most-reliable first:
    //   1. Auto-attempt the intent on load (covers Chrome / system WebView).
    //   2. ALSO render a real <a href="intent://…"> "Open in app" button so a
    //      single tap reliably fires the intent in Brave/Firefox/etc.
    //   3. The intent's own S.browser_fallback_url handles "app not installed".
    // No JS timer racing the OS (that was an earlier, separate bug).
    handoff = `
      var app = ${JSON.stringify(app)};
      function openApp(){ try { window.location.href = app; } catch (e) {} }
      // Auto-attempt (Chrome / WebView honour this). Tiny delay lets the page
      // paint the manual button first so Brave/Firefox users have it instantly.
      setTimeout(openApp, 60);
      // Wire the visible button to fire the intent from a real user gesture.
      var btn = document.getElementById('openapp');
      if (btn) btn.addEventListener('click', function(){ openApp(); });`
  } else {
    // iOS: try the custom scheme, fall back to web if the app didn't open.
    // We watch for the page being hidden (app took over) to cancel the fallback.
    handoff = `
      var web = ${JSON.stringify(web)};
      var app = ${JSON.stringify(app)};
      var done = false;
      var start = Date.now();
      function goWeb(){
        if (done) return;
        // If a lot of wall-clock time elapsed, the app likely opened (JS was
        // suspended) — don't yank the user back to the browser.
        if (Date.now() - start > 2200) return;
        done = true;
        window.location.replace(web);
      }
      var hidden = false;
      document.addEventListener('visibilitychange', function(){
        if (document.hidden) { hidden = true; done = true; }
      });
      window.addEventListener('pagehide', function(){ done = true; });
      var btn = document.getElementById('openapp');
      if (btn) btn.addEventListener('click', function(){ done = true; try { window.location.href = app; } catch(e){} });
      // Attempt the app scheme automatically.
      try { window.location.href = app; } catch (e) { window.location.replace(web); }
      // If still here after the grace period and not hidden, go to web.
      setTimeout(function(){ if (!hidden) goWeb(); }, 1500);`
  }

  // The "Open in app" button: on Android it's a real intent:// link (so a tap
  // launches the app even in browsers that block auto-intents); on iOS it's the
  // custom scheme. Either way it works from a genuine user gesture.
  const openBtn = app
    ? `<a id="openapp" class="btn" href="${safeApp}">Open in ${display} app</a>`
    : ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Opening ${display}…</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#14100E;color:#EDE3D2;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
  .box{padding:2rem;max-width:340px}
  .spin{width:34px;height:34px;border:3px solid rgba(255,255,255,.25);border-top-color:#E5A23D;border-radius:50%;animation:s .8s linear infinite;margin:0 auto 1rem}
  @keyframes s{to{transform:rotate(360deg)}}
  a{color:#E5A23D}
  .btn{display:block;margin:1.25rem auto 0;padding:.85rem 1.2rem;border-radius:999px;background:linear-gradient(135deg,#ff7a18,#e6492d 55%,#c81d4a);color:#fff;font-weight:700;text-decoration:none;box-shadow:0 10px 22px -10px rgba(200,29,74,.8)}
  .btn:active{transform:scale(.97)}
  .web{display:inline-block;margin-top:1rem;font-size:.85rem;opacity:.75}
</style></head>
<body>
  <div class="box">
    <div class="spin"></div>
    <p>Opening ${display}…</p>
    ${openBtn}
    <a class="web" id="fb" href="${safeWeb}">Continue on web instead</a>
  </div>
  <script>
  (function(){${handoff}})();
  </script>
</body></html>`
}

export function retailerDisplayName(r: Retailer): string {
  return { amazon: 'Amazon', flipkart: 'Flipkart', myntra: 'Myntra', ajio: 'AJIO', other: 'the store' }[r]
}
