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
const VALID = 'https://kuula.co/share/collection/7T3NS'

let dir
let app
let store

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-tours-'))
  process.env.DATA_DIR = dir
  process.env.SESSION_SECRET = 'test-session-secret'
  vi.resetModules()

  process.env.ADMIN_PASSWORD_HASH = HASH
  const auth = await import('./auth.js')
  auth.resetRateLimit()

  store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  app = createApp()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
  delete process.env.ADMIN_PASSWORD_HASH
})

async function login() {
  const res = await request(app).post('/api/auth/login').send({ password: PASSWORD })
  return res.headers['set-cookie']
}

describe('authorisation', () => {
  it('refuses every unauthenticated mutation', async () => {
    const target = store.read().tours[0]
    await request(app).post('/api/tours').send({ title: 'x', embedUrl: VALID }).expect(401)
    await request(app).patch(`/api/tours/${target.id}`).send({ title: 'x' }).expect(401)
    await request(app).delete(`/api/tours/${target.id}`).expect(401)
  })
})

describe('POST /api/tours', () => {
  it('creates a tour at the end of the list', async () => {
    const cookie = await login()
    const before = store.read().tours.length

    const res = await request(app)
      .post('/api/tours')
      .set('Cookie', cookie)
      .send({ title: 'Explorer 21', embedUrl: VALID })
      .expect(201)

    expect(res.body.tour.title).toBe('Explorer 21')
    expect(store.read().tours.length).toBe(before + 1)
    expect(res.body.tour.sortOrder).toBe(before)
  })

  it('rejects an off-allowlist or non-https embed URL', async () => {
    const cookie = await login()
    for (const embedUrl of [
      'javascript:alert(1)',
      'http://kuula.co/share/x',
      'https://evil.example.com/x',
    ]) {
      await request(app)
        .post('/api/tours')
        .set('Cookie', cookie)
        .send({ title: 'bad', embedUrl })
        .expect(400)
    }
  })

  it('requires a title', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/tours')
      .set('Cookie', cookie)
      .send({ embedUrl: VALID })
      .expect(400)
  })
})

describe('PATCH /api/tours/:id', () => {
  it('updates the title', async () => {
    const cookie = await login()
    const target = store.read().tours[0]

    await request(app)
      .patch(`/api/tours/${target.id}`)
      .set('Cookie', cookie)
      .send({ title: 'Renamed' })
      .expect(200)

    expect(store.read().tours.find((t) => t.id === target.id).title).toBe('Renamed')
  })

  it('still validates the embed URL on update', async () => {
    const cookie = await login()
    const target = store.read().tours[0]
    await request(app)
      .patch(`/api/tours/${target.id}`)
      .set('Cookie', cookie)
      .send({ embedUrl: 'https://evil.example.com/x' })
      .expect(400)
  })
})

describe('DELETE /api/tours/:id', () => {
  it('removes the tour', async () => {
    const cookie = await login()
    const target = store.read().tours[0]
    await request(app).delete(`/api/tours/${target.id}`).set('Cookie', cookie).expect(200)
    expect(store.read().tours.some((t) => t.id === target.id)).toBe(false)
  })
})

describe('GET /api/admin/export', () => {
  it('requires auth and returns the whole store', async () => {
    await request(app).get('/api/admin/export').expect(401)

    const cookie = await login()
    const res = await request(app).get('/api/admin/export').set('Cookie', cookie).expect(200)
    expect(res.headers['content-disposition']).toContain('attachment')
    expect(res.body.photos.length).toBeGreaterThan(0)
  })
})
