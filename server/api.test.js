// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let dir
let app

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-api-'))
  process.env.DATA_DIR = dir
  vi.resetModules()
  const store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  app = createApp()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('GET /api/content', () => {
  it('returns the three collections and the tours', async () => {
    const res = await request(app).get('/api/content').expect(200)

    expect(Object.keys(res.body.gallery).sort()).toEqual(['exteriors', 'interiors', 'page'])
    expect(res.body.gallery.page.length).toBeGreaterThan(0)
    expect(res.body.tours.length).toBeGreaterThan(0)
    expect(res.body.tours[0].embedUrl).toContain('kuula.co')
  })

  it('sorts each collection by sortOrder', async () => {
    const res = await request(app).get('/api/content').expect(200)
    const orders = res.body.gallery.page.map((p) => p.sortOrder)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('is cacheable and honours If-None-Match', async () => {
    const first = await request(app).get('/api/content').expect(200)
    expect(first.headers['cache-control']).toContain('max-age=60')

    const etag = first.headers.etag
    expect(etag).toBeTruthy()

    await request(app).get('/api/content').set('If-None-Match', etag).expect(304)
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
