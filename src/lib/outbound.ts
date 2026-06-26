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

// ---- Deep-link builders ------------------------------------------------------
// Returns { app, web } where `app` is the native-app deep link (may be a custom
// scheme or an android intent:// URL) and `web` is the safe https fallback.
export function buildDeepLinks(destUrl: string, retailer: Retailer, device: Device): { app?: string; web: string } {
  const web = destUrl
  if (device === 'desktop') return { web }

  if (retailer === 'amazon') {
    if (device === 'android') {
      // intent:// auto-falls-back to the browser if the app is missing.
      return { app: toAndroidIntent(destUrl, 'com.amazon.mShop.android.shopping'), web }
    }
    // iOS: Amazon registers the http(s) universal link + a custom scheme.
    // Universal links open the app automatically when installed; we still try
    // the scheme as a nudge. Use the web URL with the app's known scheme host.
    return { app: destUrl.replace(/^https?:\/\//, 'com.amazon.mobile.shopping.web://'), web }
  }

  if (retailer === 'flipkart') {
    if (device === 'android') {
      return { app: toAndroidIntent(destUrl, 'com.flipkart.android'), web }
    }
    return { app: destUrl.replace(/^https?:\/\//, 'flipkart://'), web }
  }

  if (retailer === 'myntra') {
    if (device === 'android') return { app: toAndroidIntent(destUrl, 'com.myntra.android'), web }
    return { app: destUrl.replace(/^https?:\/\//, 'myntra://'), web }
  }

  // ajio / other: no reliable public scheme — universal links (if any) still
  // open the app via the plain https URL, so just hand over the web URL.
  return { web }
}

// Build an Android intent:// URL with a browser fallback baked in. If the app
// isn't installed, Chrome follows S.browser_fallback_url back to the web URL.
function toAndroidIntent(httpsUrl: string, pkg: string): string {
  let rest = httpsUrl.replace(/^https?:\/\//, '')
  const fallback = encodeURIComponent(httpsUrl)
  return `intent://${rest}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${fallback};end`
}

// ---- Interstitial ------------------------------------------------------------
// A minimal, instant HTML page that attempts the app deep link then falls back
// to the web URL. Kept tiny (inline, no external assets) so TTFB stays low and
// the handoff feels instant. noindex so it never gets crawled/indexed.
export function buildInterstitial(app: string | undefined, web: string, retailerName: string): string {
  const safeWeb = web.replace(/"/g, '&quot;')
  const safeApp = (app || '').replace(/"/g, '&quot;')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Opening ${retailerName}…</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#14100E;color:#EDE3D2;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
  .box{padding:2rem}
  .spin{width:34px;height:34px;border:3px solid rgba(255,255,255,.25);border-top-color:#E5A23D;border-radius:50%;animation:s .8s linear infinite;margin:0 auto 1rem}
  @keyframes s{to{transform:rotate(360deg)}}
  a{color:#E5A23D}
</style></head>
<body>
  <div class="box">
    <div class="spin"></div>
    <p>Opening ${retailerName}…</p>
    <p style="font-size:.85rem;opacity:.7">Not redirected? <a id="fb" href="${safeWeb}">Tap here to continue</a></p>
  </div>
  <script>
  (function(){
    var app=${app ? `"${safeApp}"` : 'null'};
    var web="${safeWeb}";
    var done=false;
    function goWeb(){ if(done) return; done=true; window.location.replace(web); }
    // Try the app deep link first.
    if(app){
      // If the app opens, the page is backgrounded and our fallback timer is
      // throttled/cancelled. If it doesn't, we bounce to web quickly.
      var t=setTimeout(goWeb, 1200);
      document.addEventListener('visibilitychange', function(){ if(document.hidden){ clearTimeout(t); } });
      try { window.location.href = app; } catch(e){ goWeb(); }
    } else {
      goWeb();
    }
    // Hard safety net.
    setTimeout(goWeb, 2500);
  })();
  </script>
</body></html>`
}

export function retailerDisplayName(r: Retailer): string {
  return { amazon: 'Amazon', flipkart: 'Flipkart', myntra: 'Myntra', ajio: 'AJIO', other: 'the store' }[r]
}
