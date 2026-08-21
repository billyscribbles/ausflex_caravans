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
let store

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-vans-'))
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

const firstVan = () => store.read().vans.items[0]

describe('authorisation', () => {
  it('refuses every unauthenticated mutation', async () => {
    const target = firstVan()
    await request(app).post('/api/vans').send({ name: 'x' }).expect(401)
    await request(app).patch('/api/vans/page').send({ heading: 'x' }).expect(401)
    await request(app).patch(`/api/vans/${target.id}`).send({ name: 'x' }).expect(401)
    await request(app).post('/api/vans/reorder').send({ ids: [] }).expect(401)
  })
})

describe('PATCH /api/vans/page', () => {
  it('updates the intro copy without touching the items', async () => {
    const cookie = await login()
    const before = store.read().vans.items.length

    const res = await request(app)
      .patch('/api/vans/page')
      .set('Cookie', cookie)
      .send({ heading: 'Every adventure, covered.' })
      .expect(200)

    expect(res.body.page.heading).toBe('Every adventure, covered.')
    expect(res.body.page.items).toBeUndefined()
    expect(store.read().vans.heading).toBe('Every adventure, covered.')
    expect(store.read().vans.items.length).toBe(before)
  })

  it('rejects over-long copy', async () => {
    const cookie = await login()
    await request(app)
      .patch('/api/vans/page')
      .set('Cookie', cookie)
      .send({ sub: 'a'.repeat(301) })
      .expect(400)
  })
})

describe('POST /api/vans', () => {
  it('creates a van at the end with a derived slug', async () => {
    const cookie = await login()
    const before = store.read().vans.items.length

    const res = await request(app)
      .post('/api/vans')
      .set('Cookie', cookie)
      .send({ name: 'Desert Runner' })
      .expect(201)

    expect(res.body.van.slug).toBe('desert-runner')
    expect(res.body.van.description).toEqual([])
    expect(res.body.van.specs).toEqual([])
    expect(res.body.van.image).toBeNull()

    const items = store.read().vans.items
    expect(items.length).toBe(before + 1)
    expect(Math.max(...items.map((v) => v.sortOrder))).toBe(res.body.van.sortOrder)
  })

  it('suffixes a slug that is already taken', async () => {
    const cookie = await login()
    const name = firstVan().name

    const res = await request(app)
      .post('/api/vans')
      .set('Cookie', cookie)
      .send({ name })
      .expect(201)

    expect(res.body.van.slug).toMatch(/-2$/)
  })

  it('requires a name', async () => {
    const cookie = await login()
    await request(app).post('/api/vans').set('Cookie', cookie).send({}).expect(400)
    await request(app).post('/api/vans').set('Cookie', cookie).send({ name: '   ' }).expect(400)
  })
})

describe('PATCH /api/vans/:id', () => {
  it('updates text, paragraphs and specs', async () => {
    const cookie = await login()
    const target = firstVan()

    const res = await request(app)
      .patch(`/api/vans/${target.id}`)
      .set('Cookie', cookie)
      .send({
        name: 'Tuff Mudder II',
        length: '13ft',
        description: ['First paragraph.', '   ', 'Second paragraph.'],
        specs: ['13ft body', ''],
      })
      .expect(200)

    expect(res.body.van.name).toBe('Tuff Mudder II')
    // Blank entries are filtered rather than rejected.
    expect(res.body.van.description).toEqual(['First paragraph.', 'Second paragraph.'])
    expect(res.body.van.specs).toEqual(['13ft body'])
  })

  it('404s an unknown van', async () => {
    const cookie = await login()
    await request(app).patch('/api/vans/nope').set('Cookie', cookie).send({ name: 'x' }).expect(404)
  })

  it('rejects a malformed slug and a slug already in use', async () => {
    const cookie = await login()
    const [first, second] = store.read().vans.items

    await request(app)
      .patch(`/api/vans/${first.id}`)
      .set('Cookie', cookie)
      .send({ slug: 'Not A Slug' })
      .expect(400)

    // name rides along with the colliding slug so the assertion below can
    // prove the whole write was rejected, not just the slug field — the
    // collision check runs inside the mutate() callback, before any field on
    // the target is touched, so a losing request must leave everything as it
    // was.
    await request(app)
      .patch(`/api/vans/${first.id}`)
      .set('Cookie', cookie)
      .send({ slug: second.slug, name: 'Should Not Persist' })
      .expect(400)

    expect(store.read().vans.items.find((v) => v.id === first.id).name).toBe(first.name)
  })

  it('allows a van to keep its own slug', async () => {
    const cookie = await login()
    const target = firstVan()
    await request(app)
      .patch(`/api/vans/${target.id}`)
      .set('Cookie', cookie)
      .send({ slug: target.slug })
      .expect(200)
  })
})

describe('POST /api/vans/reorder', () => {
  it('rewrites sortOrder to match the given order', async () => {
    const cookie = await login()
    const ids = store.read().vans.items.map((v) => v.id)
    const reversed = [...ids].reverse()

    await request(app)
      .post('/api/vans/reorder')
      .set('Cookie', cookie)
      .send({ ids: reversed })
      .expect(200)

    const sorted = [...store.read().vans.items].sort((a, b) => a.sortOrder - b.sortOrder)
    expect(sorted.map((v) => v.id)).toEqual(reversed)
  })

  it('requires an ids array', async () => {
    const cookie = await login()
    await request(app).post('/api/vans/reorder').set('Cookie', cookie).send({}).expect(400)
  })
})
