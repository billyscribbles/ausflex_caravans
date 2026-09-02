// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { legacyRedirects } from './legacyRedirects.js'

let dir
let app

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-legacy-'))
  process.env.DATA_DIR = dir
  process.env.SESSION_SECRET = 'test-session-secret'
  vi.resetModules()
  const store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  app = createApp()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('legacy WordPress redirects', () => {
  it('301s every mapped old path to its replacement', async () => {
    for (const [from, to] of legacyRedirects) {
      const res = await request(app).get(from)
      expect(res.status, `${from} should 301`).toBe(301)
      expect(res.headers.location, `${from} -> ${to}`).toBe(to)
    }
  })

  // WordPress linked every page with a trailing slash, so both shapes are in
  // Google's index.
  it('handles the trailing-slash form the old site actually linked', async () => {
    const res = await request(app).get('/our-vans/12ft-tuff-mudder/')
    expect(res.status).toBe(301)
    expect(res.headers.location).toBe('/vans/tuff-mudder')
  })

  it('carries the query string through, so campaign tags survive', async () => {
    const res = await request(app).get('/about-us/?utm_source=google&utm_medium=organic')
    expect(res.status).toBe(301)
    expect(res.headers.location).toBe('/about?utm_source=google&utm_medium=organic')
  })

  it('does not touch a current route', async () => {
    const res = await request(app).get('/vans')
    expect(res.status).toBe(200)
  })

  it('leaves the API alone', async () => {
    const res = await request(app).get('/api/content')
    expect(res.status).toBe(200)
  })

  // Every target must be a real route, or the redirect just moves the soft 404.
  it('points every redirect at a path the app actually serves', async () => {
    for (const to of new Set(legacyRedirects.values())) {
      const res = await request(app).get(to)
      expect(res.status, `${to} should be a live route`).toBe(200)
    }
  })
})
