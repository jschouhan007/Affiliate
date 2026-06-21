// Admin auth — Cloudflare Workers compatible (Web Crypto only, no Node APIs).
// Strategy: password (from ADMIN_PASSWORD secret) is checked server-side. On success
// we issue an HMAC-signed, time-stamped cookie token signed with ADMIN_SECRET.

const COOKIE_NAME = 'ds_admin'
const MAX_AGE = 60 * 60 * 12 // 12 hours

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc(data))
  return b64url(sig)
}

// Constant-time-ish string compare
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

function effectiveSecret(env: { ADMIN_SECRET?: string; ADMIN_PASSWORD?: string }): string {
  // Prefer a dedicated secret; fall back to deriving from the password so the
  // setup stays single-secret-friendly in development.
  return env.ADMIN_SECRET || `ds-sig-${env.ADMIN_PASSWORD || 'dev'}`
}

export async function createToken(env: { ADMIN_SECRET?: string; ADMIN_PASSWORD?: string }): Promise<string> {
  const issued = Date.now().toString()
  const sig = await hmac(effectiveSecret(env), issued)
  return `${issued}.${sig}`
}

export async function verifyToken(
  token: string | undefined,
  env: { ADMIN_SECRET?: string; ADMIN_PASSWORD?: string }
): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot < 0) return false
  const issued = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const ts = parseInt(issued, 10)
  if (!Number.isFinite(ts)) return false
  if (Date.now() - ts > MAX_AGE * 1000) return false
  const expected = await hmac(effectiveSecret(env), issued)
  return safeEqual(sig, expected)
}

export function checkPassword(input: string, env: { ADMIN_PASSWORD?: string }): boolean {
  // If no password configured, allow a dev default so /admin is reachable locally.
  const pw = env.ADMIN_PASSWORD || 'dealspot-admin'
  return !!input && safeEqual(input, pw)
}

export function cookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

export function readCookie(cookieStr: string | undefined): string | undefined {
  if (!cookieStr) return undefined
  const parts = cookieStr.split(/;\s*/)
  for (const p of parts) {
    const eq = p.indexOf('=')
    if (eq > 0 && p.slice(0, eq) === COOKIE_NAME) return p.slice(eq + 1)
  }
  return undefined
}
