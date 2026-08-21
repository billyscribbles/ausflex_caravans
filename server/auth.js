// Shared-password auth. scrypt and HMAC come from node:crypto so nothing here
// needs a native module — bcrypt and jsonwebtoken are deliberately avoided.
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LEN = 64
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX = 10

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await scryptAsync(password, salt, KEY_LEN)
  return `${salt}:${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, keyHex] = stored.split(':')
  let expected
  try {
    expected = Buffer.from(keyHex, 'hex')
  } catch {
    return false
  }
  if (expected.length !== KEY_LEN) return false
  const actual = await scryptAsync(password, salt, KEY_LEN)
  return timingSafeEqual(expected, actual)
}

export function signSession(secret, now = Date.now()) {
  const exp = String(now + SESSION_TTL_MS)
  const sig = createHmac('sha256', secret).update(exp).digest('hex')
  return `${exp}.${sig}`
}

export function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return false
  const [exp, sig] = token.split('.')
  const expected = createHmac('sha256', secret).update(exp).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  // timingSafeEqual throws on length mismatch, so gate on length first.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  return Number(exp) > now
}

// In-memory, per-IP. With a single shared password this is the only barrier
// between the internet and write access, so it is load-bearing.
const attempts = new Map()

export function rateLimit(ip, now = Date.now()) {
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) {
    attempts.set(ip, recent)
    return false
  }
  recent.push(now)
  attempts.set(ip, recent)
  return true
}

export function resetRateLimit() {
  attempts.clear()
}
