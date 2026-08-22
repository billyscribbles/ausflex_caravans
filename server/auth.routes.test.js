// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from './auth.js'

const PASSWORD = 'test-password-123'
// scrypt is deliberately slow — hash once for the whole file, not per test.
const HASH = await hashPassword(PASSWORD)
let dir
let app

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-auth-'))
  process.env.DATA_DIR = dir
  process.env.SESSION_SECRET = 'test-session-secret'
  vi.resetModules()

  process.env.ADMIN_PASSWORD_HASH = HASH
  const auth = await import('./auth.js')
  auth.resetRateLimit()

  const store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  app = createApp()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
  delete process.env.ADMIN_PASSWORD_HASH
})

describe('POST /api/auth/login', () => {
  it('accepts the right password and sets an HttpOnly cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: PASSWORD }).expect(200)

    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/ausflex_session=/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Strict/)
  })

  it('rejects the wrong password without setting a cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'nope' }).expect(401)
    expect(res.headers['set-cookie']).toBeUndefined()
  })

  it('rejects a non-string password instead of crashing the process', async () => {
    // Regression guard: `password` used to reach scrypt (via verifyPassword)
    // unguarded. scrypt rejects on any non-string input, this route wasn't
    // wrapped in asyncHandler, and Express 4 does not forward an async
    // handler's rejection to error middleware on its own — so the rejection
    // was unhandled and crashed the process (Node's default
    // --unhandled-rejections=throw). No new error shape here: a bad type
    // gets the exact same 401 as a wrong password, so the difference is not
    // an oracle for what the server accepts.
    const objectRes = await request(app)
      .post('/api/auth/login')
      .send({ password: { evil: true } })
      .expect(401)
    expect(objectRes.body).toEqual({ error: 'incorrect password' })

    const arrayRes = await request(app)
      .post('/api/auth/login')
      .send({ password: ['a', 'b'] })
      .expect(401)
    expect(arrayRes.body).toEqual({ error: 'incorrect password' })
  })

  it('rate-limits after 10 failed attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').send({ password: 'nope' })
    }
    await request(app).post('/api/auth/login').send({ password: PASSWORD }).expect(429)
  })
})

describe('session lifecycle', () => {
  it('reports authed:false before login and true after', async () => {
    const anon = await request(app).get('/api/auth/session').expect(200)
    expect(anon.body.authed).toBe(false)

    const login = await request(app).post('/api/auth/login').send({ password: PASSWORD })
    const cookie = login.headers['set-cookie']

    const authed = await request(app).get('/api/auth/session').set('Cookie', cookie).expect(200)
    expect(authed.body.authed).toBe(true)
  })

  it('logout clears the session', async () => {
    const login = await request(app).post('/api/auth/login').send({ password: PASSWORD })
    const cookie = login.headers['set-cookie']

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200)

    const after = await request(app)
      .get('/api/auth/session')
      .set('Cookie', ['ausflex_session='])
      .expect(200)
    expect(after.body.authed).toBe(false)
  })

  it('rejects a forged cookie', async () => {
    const res = await request(app)
      .get('/api/auth/session')
      .set('Cookie', [`ausflex_session=${Date.now() + 999999}.deadbeef`])
      .expect(200)
    expect(res.body.authed).toBe(false)
  })
})

describe('when no password is configured', () => {
  it('boots and refuses every login rather than crashing', async () => {
    delete process.env.ADMIN_PASSWORD_HASH
    vi.resetModules()
    const store = await import('./store.js')
    await store.load()
    const { createApp } = await import('./app.js')
    const bare = createApp()

    await request(bare).post('/api/auth/login').send({ password: 'anything' }).expect(401)
  })
})
