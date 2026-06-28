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

  // How long the user has to choose before we auto-open the app.
  const COUNTDOWN = 5 // seconds

  // No app deep link available (desktop / unknown retailer) → just send to web.
  if (!app) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Opening ${display}…</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#14100E;color:#EDE3D2;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
  .box{padding:2rem;max-width:340px}
  .spin{width:34px;height:34px;border:3px solid rgba(255,255,255,.25);border-top-color:#E5A23D;border-radius:50%;animation:s .8s linear infinite;margin:0 auto 1rem}
  @keyframes s{to{transform:rotate(360deg)}}
</style></head>
<body>
  <div class="box"><div class="spin"></div><p>Opening ${display}…</p></div>
  <script>(function(){window.location.replace(${JSON.stringify(web)});})();</script>
</body></html>`
  }

  // Shared "open the app" implementation differs per platform:
  //   * ANDROID: navigate to the intent:// URL. Android opens the app if
  //     installed, else follows S.browser_fallback_url to the web URL. Many
  //     non-Chrome browsers (Brave/Firefox) only honour this from a user gesture,
  //     which is why we ALSO keep the manual "Open in app" button as a real <a>.
  //   * iOS: try the custom scheme; if the app isn't installed the scheme
  //     dead-ends silently, so we arm a short timer that falls back to web.
  let openAppFn: string
  if (isAndroidIntent) {
    openAppFn = `
      function openApp(){ try { window.location.href = app; } catch (e) {} }`
  } else {
    // iOS: attempting the scheme + a guarded fallback to web if app is missing.
    openAppFn = `
      function openApp(){
        var t0 = Date.now();
        try { window.location.href = app; } catch (e) { window.location.replace(web); return; }
        // If we're still visible ~1.6s later, the app almost certainly isn't
        // installed (a successful launch backgrounds/suspends this page).
        setTimeout(function(){
          if (document.hidden) return;            // app took over
          if (Date.now() - t0 > 2600) return;     // JS was suspended → app opened
          window.location.replace(web);
        }, 1600);
      }`
  }

  // The countdown handoff: show the timer ticking down; let the user tap either
  // button at any time; when it reaches 0 auto-open the app (which itself falls
  // back to web if the app isn't installed).
  const handoff = `
    var app = ${JSON.stringify(app)};
    var web = ${JSON.stringify(web)};
    var n = ${COUNTDOWN};
    var fired = false;
    var hidden = false;
    document.addEventListener('visibilitychange', function(){ if (document.hidden) hidden = true; });
    ${openAppFn}
    function fireApp(){
      if (fired) return; fired = true;
      clearInterval(iv);
      openApp();
    }
    var elNum = document.getElementById('count');
    var elBar = document.getElementById('bar');
    function render(){
      if (elNum) elNum.textContent = n;
      if (elBar) elBar.style.width = ((${COUNTDOWN} - n) / ${COUNTDOWN} * 100) + '%';
    }
    render();
    var iv = setInterval(function(){
      n -= 1;
      if (n <= 0){ render(); fireApp(); return; }
      render();
    }, 1000);
    var openBtn = document.getElementById('openapp');
    if (openBtn) openBtn.addEventListener('click', function(){
      // Let the real <a href> navigate on Android (user gesture fires intent);
      // for iOS we still call openApp() to arm the fallback timer.
      ${isAndroidIntent ? 'fired = true; clearInterval(iv);' : 'fireApp();'}
    });
    var webBtn = document.getElementById('fb');
    if (webBtn) webBtn.addEventListener('click', function(){
      fired = true; clearInterval(iv); // user chose web — let the <a href> go
    });`

  // The "Open in app" button: on Android it's a real intent:// link (a tap
  // launches the app even in browsers that block auto-intents); on iOS it's the
  // custom scheme. Either way it works from a genuine user gesture.
  const openBtn = `<a id="openapp" class="btn btn-app" href="${safeApp}">Open in ${display} app</a>`
  const webBtn = `<a id="fb" class="btn btn-web" href="${safeWeb}">Continue in browser</a>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Opening ${display}…</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#14100E;color:#EDE3D2;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
  .box{padding:2rem;max-width:360px;width:100%}
  .ring{position:relative;width:88px;height:88px;margin:0 auto 1.25rem}
  .ring svg{transform:rotate(-90deg)}
  .ring .track{stroke:rgba(255,255,255,.12)}
  .ring .prog{stroke:#E5A23D;stroke-linecap:round;stroke-dasharray:264;stroke-dashoffset:264;animation:dash ${COUNTDOWN}s linear forwards}
  @keyframes dash{to{stroke-dashoffset:0}}
  .count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#E5A23D}
  h1{font-size:1.15rem;margin:.2rem 0 .35rem}
  .sub{font-size:.9rem;opacity:.75;margin:0 0 1.4rem;line-height:1.4}
  .btn{display:block;margin:.7rem auto 0;padding:.9rem 1.2rem;border-radius:999px;font-weight:700;text-decoration:none;font-size:1rem}
  .btn-app{background:linear-gradient(135deg,#ff7a18,#e6492d 55%,#c81d4a);color:#fff;box-shadow:0 10px 22px -10px rgba(200,29,74,.8)}
  .btn-web{background:rgba(255,255,255,.08);color:#EDE3D2;border:1px solid rgba(255,255,255,.16)}
  .btn:active{transform:scale(.97)}
  .progress{height:4px;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden;margin:1.2rem 0 0}
  .progress > span{display:block;height:100%;width:0;background:#E5A23D;transition:width 1s linear}
</style></head>
<body>
  <div class="box">
    <div class="ring">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle class="track" cx="44" cy="44" r="42" fill="none" stroke-width="4"></circle>
        <circle class="prog" cx="44" cy="44" r="42" fill="none" stroke-width="4"></circle>
      </svg>
      <div class="count" id="count">${COUNTDOWN}</div>
    </div>
    <h1>Opening the ${display} app…</h1>
    <p class="sub">Opening the app automatically in a few seconds. If it isn't installed, we'll continue in your browser.</p>
    ${openBtn}
    ${webBtn}
    <div class="progress"><span id="bar"></span></div>
  </div>
  <script>
  (function(){${handoff}})();
  </script>
</body></html>`
}

export function retailerDisplayName(r: Retailer): string {
  return { amazon: 'Amazon', flipkart: 'Flipkart', myntra: 'Myntra', ajio: 'AJIO', other: 'the store' }[r]
}
