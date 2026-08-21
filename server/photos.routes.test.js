// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from './auth.js'

const PASSWORD = 'test-password-123'
// scrypt is deliberately slow — hash once for the whole file, not per test.
const HASH = await hashPassword(PASSWORD)
// Smallest valid PNG — one transparent pixel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

let dir
let app
let store

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-photos-'))
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
  it('refuses an unauthenticated DELETE and leaves the store untouched', async () => {
    const target = store.read().photos[0]
    const before = store.read().photos.length

    await request(app).delete(`/api/photos/${target.id}`).expect(401)

    expect(store.read().photos.length).toBe(before)
    expect(store.read().photos.some((p) => p.id === target.id)).toBe(true)
  })

  it('refuses unauthenticated upload, patch and reorder', async () => {
    const target = store.read().photos[0]
    await request(app).post('/api/photos').attach('file', PNG, 'x.png').expect(401)
    await request(app).patch(`/api/photos/${target.id}`).send({ alt: 'hacked' }).expect(401)
    await request(app).post('/api/photos/reorder').send({ collection: 'page', ids: [] }).expect(401)
  })
})

describe('POST /api/photos', () => {
  it('stores the file and appends a row pointing at /uploads', async () => {
    const cookie = await login()
    const before = store.read().photos.filter((p) => p.collection === 'page').length

    const res = await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'page')
      .field('alt', 'A new van')
      .attach('file', PNG, 'photo.png')
      .expect(201)

    expect(res.body.photo.src).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/)
    expect(res.body.photo.alt).toBe('A new van')
    expect(res.body.photo.collection).toBe('page')

    const after = store.read().photos.filter((p) => p.collection === 'page')
    expect(after.length).toBe(before + 1)
    // The row sorts last so new photos land at the end of the collection.
    expect(Math.max(...after.map((p) => p.sortOrder))).toBe(res.body.photo.sortOrder)

    const files = await readdir(join(dir, 'uploads'))
    expect(files.length).toBe(1)
  })

  it('rejects a non-image', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'page')
      .attach('file', Buffer.from('<html>hi</html>'), {
        filename: 'x.html',
        contentType: 'text/html',
      })
      .expect(400)
  })

  it('rejects an unknown collection', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'nonsense')
      .attach('file', PNG, 'photo.png')
      .expect(400)
  })

  it('ignores the client filename and never writes outside uploads/', async () => {
    const cookie = await login()
    const res = await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'page')
      .attach('file', PNG, '../../../etc/passwd.png')
      .expect(201)

    expect(res.body.photo.src).not.toContain('..')
    const files = await readdir(join(dir, 'uploads'))
    expect(files.every((f) => !f.includes('passwd'))).toBe(true)
  })
})

describe('PATCH /api/photos/:id', () => {
  it('updates alt and caption', async () => {
    const cookie = await login()
    const target = store.read().photos[0]

    await request(app)
      .patch(`/api/photos/${target.id}`)
      .set('Cookie', cookie)
      .send({ alt: 'Updated alt', caption: 'Updated caption' })
      .expect(200)

    const updated = store.read().photos.find((p) => p.id === target.id)
    expect(updated.alt).toBe('Updated alt')
    expect(updated.caption).toBe('Updated caption')
  })

  it('404s for an unknown id', async () => {
    const cookie = await login()
    await request(app)
      .patch('/api/photos/nope')
      .set('Cookie', cookie)
      .send({ alt: 'x' })
      .expect(404)
  })
})

describe('POST /api/photos/reorder', () => {
  it('rewrites sortOrder to match the given id order', async () => {
    const cookie = await login()
    const page = store.read().photos.filter((p) => p.collection === 'page')
    const reversed = [...page].reverse().map((p) => p.id)

    await request(app)
      .post('/api/photos/reorder')
      .set('Cookie', cookie)
      .send({ collection: 'page', ids: reversed })
      .expect(200)

    const after = store
      .read()
      .photos.filter((p) => p.collection === 'page')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.id)

    expect(after).toEqual(reversed)
  })
})

describe('DELETE /api/photos/:id', () => {
  it('removes an uploaded photo and its file', async () => {
    const cookie = await login()
    const created = await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'page')
      .attach('file', PNG, 'photo.png')

    await request(app)
      .delete(`/api/photos/${created.body.photo.id}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(store.read().photos.some((p) => p.id === created.body.photo.id)).toBe(false)
    expect(await readdir(join(dir, 'uploads'))).toEqual([])
  })

  it('removes a seeded row without touching the shipped image', async () => {
    const cookie = await login()
    const seeded = store.read().photos.find((p) => p.src.startsWith('/images/'))

    await request(app).delete(`/api/photos/${seeded.id}`).set('Cookie', cookie).expect(200)

    expect(store.read().photos.some((p) => p.id === seeded.id)).toBe(false)
    // Nothing was in uploads/ to delete, and the build asset is untouched.
    expect(await readdir(join(dir, 'uploads'))).toEqual([])
  })
})
