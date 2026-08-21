// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm, readdir, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from './auth.js'

const PASSWORD = 'test-password-123'
// scrypt is deliberately slow — hash once for the whole file, not per test.
const HASH = await hashPassword(PASSWORD)

// Smallest valid PNG — multer sniffs the mimetype from the part headers, but a
// real byte payload keeps the test honest about what lands on disk.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

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

describe('POST /api/vans/:id/image', () => {
  it('sets the hero image from an upload', async () => {
    const cookie = await login()
    const target = firstVan()

    const res = await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'hero.png')
      .expect(200)

    expect(res.body.van.image).toMatch(/^\/uploads\/.+\.png$/)
    expect(store.read().vans.items.find((v) => v.id === target.id).image).toBe(res.body.van.image)
  })

  it('sets the floorplan independently of the hero image', async () => {
    const cookie = await login()
    const target = firstVan()
    const originalHero = target.image

    const res = await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'floorplan')
      .attach('file', PNG, 'plan.png')
      .expect(200)

    expect(res.body.van.floorplan).toMatch(/^\/uploads\//)
    expect(res.body.van.image).toBe(originalHero)
  })

  it('deletes the file it replaced, but never a seeded /images path', async () => {
    const cookie = await login()
    const target = firstVan()
    expect(target.image.startsWith('/images/')).toBe(true)

    const first = await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'one.png')
      .expect(200)

    // The seeded /images/ path is part of the build; nothing was unlinked.
    expect(await readdir(join(dir, 'uploads'))).toHaveLength(1)

    await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'two.png')
      .expect(200)

    // The first upload replaced itself rather than accumulating.
    const files = await readdir(join(dir, 'uploads'))
    expect(files).toHaveLength(1)
    expect(files[0]).not.toBe(first.body.van.image.split('/').pop())
  })

  it('rejects an unknown field and a non-image', async () => {
    const cookie = await login()
    const target = firstVan()

    await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'blurb')
      .attach('file', PNG, 'x.png')
      .expect(400)

    await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', Buffer.from('<html>hi</html>'), {
        filename: 'x.html',
        contentType: 'text/html',
      })
      .expect(400)
  })

  it('404s an unknown van and 401s without a session', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/vans/nope/image')
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'x.png')
      .expect(404)

    await request(app)
      .post(`/api/vans/${firstVan().id}/image`)
      .field('field', 'image')
      .attach('file', PNG, 'x.png')
      .expect(401)
  })
})

describe('DELETE /api/vans/:id', () => {
  it('removes the van, its gallery rows and their files', async () => {
    const cookie = await login()
    const target = firstVan()
    const collection = `van:${target.id}`

    await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', collection)
      .attach('file', PNG, 'gallery.png')
      .expect(201)

    await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'hero.png')
      .expect(200)

    expect(await readdir(join(dir, 'uploads'))).toHaveLength(2)

    await request(app).delete(`/api/vans/${target.id}`).set('Cookie', cookie).expect(200)

    expect(store.read().vans.items.find((v) => v.id === target.id)).toBeUndefined()
    expect(store.read().photos.some((p) => p.collection === collection)).toBe(false)
    expect(await readdir(join(dir, 'uploads'))).toHaveLength(0)
  })

  it('leaves other vans and the named collections alone', async () => {
    const cookie = await login()
    const [target, survivor] = store.read().vans.items
    const interiorsBefore = store.read().photos.filter((p) => p.collection === 'interiors').length

    await request(app).delete(`/api/vans/${target.id}`).set('Cookie', cookie).expect(200)

    expect(store.read().vans.items.find((v) => v.id === survivor.id)).toBeTruthy()
    expect(store.read().photos.filter((p) => p.collection === 'interiors')).toHaveLength(
      interiorsBefore,
    )
  })

  it('404s an unknown van and 401s without a session', async () => {
    const cookie = await login()
    await request(app).delete('/api/vans/nope').set('Cookie', cookie).expect(404)
    await request(app).delete(`/api/vans/${firstVan().id}`).expect(401)
  })
})

describe('error handling', () => {
  it('returns 500 with a JSON body instead of crashing when persist() fails', async () => {
    const cookie = await login()
    const target = firstVan()
    // The middleware logs the error for Railway's console — deliberate for a
    // real crash, but silenced here so a test that triggers it on purpose
    // doesn't spam the run's output.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Simulates a full or read-only Railway volume: content.json's directory
    // loses write permission, so the writeFile inside persist() rejects and
    // the mutate() promise this route awaits rejects with it. Without the
    // asyncHandler wrapper and app.js's error middleware, Express 4 never
    // forwards that rejection anywhere — no response is ever sent, and the
    // request just hangs until the client (or here, the test) times out.
    await chmod(dir, 0o500)
    try {
      const res = await request(app)
        .patch(`/api/vans/${target.id}`)
        .set('Cookie', cookie)
        .send({ name: 'Should not crash the process' })

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ error: 'internal server error' })
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      // Restored before afterEach's rm(dir, ...), which needs write access to
      // clean up the temp directory.
      await chmod(dir, 0o700)
      errorSpy.mockRestore()
    }
  })
})
