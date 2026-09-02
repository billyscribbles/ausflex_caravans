// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CANONICAL = 'example.com'

let dir

async function buildApp() {
  vi.resetModules()
  const store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  return createApp()
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-host-'))
  process.env.DATA_DIR = dir
  process.env.SESSION_SECRET = 'test-session-secret'
})

afterEach(async () => {
  delete process.env.CANONICAL_HOST
  await rm(dir, { recursive: true, force: true })
})

describe('canonical host redirect', () => {
  it('301s the www. sibling to the apex, keeping path and query', async () => {
    process.env.CANONICAL_HOST = CANONICAL
    const app = await buildApp()

    const res = await request(app)
      .get('/vans/on-site?utm_source=gbp')
      .set('Host', `www.${CANONICAL}`)

    expect(res.status).toBe(301)
    expect(res.headers.location).toBe(`https://${CANONICAL}/vans/on-site?utm_source=gbp`)
  })

  it('serves the apex directly instead of redirecting it to itself', async () => {
    process.env.CANONICAL_HOST = CANONICAL
    const app = await buildApp()

    const res = await request(app).get('/api/content').set('Host', CANONICAL)

    expect(res.status).toBe(200)
  })

  // The Railway URL is how staging checks and Lighthouse reach the app before
  // DNS is cut over — redirecting it would break both.
  it('leaves an unrelated host alone', async () => {
    process.env.CANONICAL_HOST = CANONICAL
    const app = await buildApp()

    const res = await request(app)
      .get('/api/content')
      .set('Host', 'ausflexcaravans-production.up.railway.app')

    expect(res.status).toBe(200)
  })

  it('redirects nothing when CANONICAL_HOST is unset', async () => {
    delete process.env.CANONICAL_HOST
    const app = await buildApp()

    const res = await request(app).get('/api/content').set('Host', `www.${CANONICAL}`)

    expect(res.status).toBe(200)
  })
})
