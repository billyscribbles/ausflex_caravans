// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  rateLimit,
  resetRateLimit,
} from './auth.js'

describe('password hashing', () => {
  it('round-trips the correct password', async () => {
    const stored = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('correct horse battery staple', stored)).resolves.toBe(true)
  })

  it('rejects the wrong password', async () => {
    const stored = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('wrong', stored)).resolves.toBe(false)
  })

  it('salts, so the same password hashes differently each time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })

  it('returns false rather than throwing when no hash is configured', async () => {
    await expect(verifyPassword('anything', undefined)).resolves.toBe(false)
    await expect(verifyPassword('anything', '')).resolves.toBe(false)
    await expect(verifyPassword('anything', 'garbage-no-colon')).resolves.toBe(false)
  })
})

describe('session tokens', () => {
  const secret = 'test-secret'

  it('accepts a token it just signed', () => {
    expect(verifySession(signSession(secret), secret)).toBe(true)
  })

  it('rejects a token signed with a different secret', () => {
    expect(verifySession(signSession('other-secret'), secret)).toBe(false)
  })

  it('rejects a tampered expiry', () => {
    const token = signSession(secret)
    const [, sig] = token.split('.')
    const forged = `${Date.now() + 999999999}.${sig}`
    expect(verifySession(forged, secret)).toBe(false)
  })

  it('rejects an expired token', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    expect(verifySession(signSession(secret, eightDaysAgo), secret)).toBe(false)
  })

  it('rejects junk without throwing', () => {
    expect(verifySession(undefined, secret)).toBe(false)
    expect(verifySession('', secret)).toBe(false)
    expect(verifySession('no-dot', secret)).toBe(false)
    expect(verifySession('123.zzzz', secret)).toBe(false)
  })
})

describe('login rate limiting', () => {
  beforeEach(() => resetRateLimit())

  it('allows 10 attempts then blocks', () => {
    for (let i = 0; i < 10; i++) expect(rateLimit('1.2.3.4')).toBe(true)
    expect(rateLimit('1.2.3.4')).toBe(false)
  })

  it('tracks each IP separately', () => {
    for (let i = 0; i < 10; i++) rateLimit('1.2.3.4')
    expect(rateLimit('5.6.7.8')).toBe(true)
  })

  it('forgets attempts once the window passes', () => {
    const t0 = Date.now()
    for (let i = 0; i < 10; i++) rateLimit('1.2.3.4', t0)
    expect(rateLimit('1.2.3.4', t0)).toBe(false)
    expect(rateLimit('1.2.3.4', t0 + 16 * 60 * 1000)).toBe(true)
  })
})
