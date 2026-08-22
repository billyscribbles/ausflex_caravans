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
  dir = await mkdtemp(join(tmpdir(), 'ausflex-api-'))
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

async function login() {
  const res = await request(app).post('/api/auth/login').send({ password: PASSWORD })
  return res.headers['set-cookie']
}

describe('GET /api/content', () => {
  it('returns the three collections and the tours', async () => {
    const res = await request(app).get('/api/content').expect(200)

    expect(Object.keys(res.body.gallery).sort()).toEqual(['exteriors', 'interiors', 'page'])
    expect(res.body.gallery.page.length).toBeGreaterThan(0)
    expect(res.body.tours.length).toBeGreaterThan(0)
    expect(res.body.tours[0].embedUrl).toContain('kuula.co')
  })

  it('orders the page gallery according to /api/photos/reorder', async () => {
    // A plain index-order assertion here would pass even if the response
    // ignored sortOrder entirely, since a fresh seed's sortOrder already
    // matches array order. Driving a real reorder through the API and
    // checking /api/content reflects it is what actually exercises the sort.
    const cookie = await login()
    const before = await request(app).get('/api/content').expect(200)
    const ids = before.body.gallery.page.map((p) => p.id)
    expect(ids.length).toBeGreaterThan(1)
    const reversed = [...ids].reverse()

    await request(app)
      .post('/api/photos/reorder')
      .set('Cookie', cookie)
      .send({ collection: 'page', ids: reversed })
      .expect(200)

    const after = await request(app).get('/api/content').expect(200)
    expect(after.body.gallery.page.map((p) => p.id)).toEqual(reversed)
  })

  it('is cacheable and honours If-None-Match', async () => {
    const first = await request(app).get('/api/content').expect(200)
    expect(first.headers['cache-control']).toContain('max-age=60')

    const etag = first.headers.etag
    expect(etag).toBeTruthy()

    await request(app).get('/api/content').set('If-None-Match', etag).expect(304)
  })

  it('returns the van range, with each gallery attached', async () => {
    const res = await request(app).get('/api/content').expect(200)

    expect(res.body.vans.heading).toBeTruthy()
    expect(res.body.vans.items.length).toBeGreaterThan(0)

    const withPhotos = res.body.vans.items.find((v) => v.photos.length > 0)
    expect(withPhotos).toBeTruthy()
    expect(withPhotos.photos[0].src).toBeTruthy()

    // The van collections never leak into the public gallery keys.
    expect(Object.keys(res.body.gallery)).toEqual(['interiors', 'exteriors', 'page'])
  })

  it('orders the van range according to /api/vans/reorder', async () => {
    // content.js's sort(byOrder) is the only thing that orders vans for
    // visitors — Range.jsx renders payload order and useVans does not sort —
    // so this is the reorder feature's last hop and the one place a plain
    // index-order assertion (which a fresh seed satisfies trivially) would
    // miss a broken or deleted sort entirely.
    const cookie = await login()
    const before = await request(app).get('/api/content').expect(200)
    const ids = before.body.vans.items.map((v) => v.id)
    expect(ids.length).toBeGreaterThan(1)
    const reversed = [...ids].reverse()

    await request(app)
      .post('/api/vans/reorder')
      .set('Cookie', cookie)
      .send({ ids: reversed })
      .expect(200)

    const after = await request(app).get('/api/content').expect(200)
    expect(after.body.vans.items.map((v) => v.id)).toEqual(reversed)
  })
})

describe('security headers', () => {
  it('sets the four headers the preview server used to set', async () => {
    const res = await request(app).get('/api/content')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(res.headers['permissions-policy']).toContain('camera=()')
  })

  it('does not advertise Express', async () => {
    const res = await request(app).get('/api/content')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})

describe('unknown API routes', () => {
  it('404 rather than falling through to the SPA', async () => {
    await request(app).get('/api/nope').expect(404)
  })
})
