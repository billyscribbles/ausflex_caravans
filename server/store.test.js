// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let dir

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-store-'))
  process.env.DATA_DIR = dir
  vi.resetModules()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

// vi.resetModules() in beforeEach clears the registry, so this re-evaluates
// store.js against the new DATA_DIR. Do NOT cache-bust with a query string —
// that forks the registry and hands app.js a different, unloaded instance.
async function freshStore() {
  return await import('./store.js')
}

describe('store', () => {
  it('seeds from the static content files when content.json is absent', async () => {
    const store = await freshStore()
    const content = await store.load()

    expect(content.version).toBe(1)
    expect(content.photos.length).toBeGreaterThan(0)
    expect(content.tours.length).toBeGreaterThan(0)

    // Van gallery photos also land in this array (their own `van:<id>`
    // collections — see the dedicated van tests below), so scope this check
    // to the base gallery collections.
    const collections = new Set(
      content.photos.filter((p) => !p.collection.startsWith('van:')).map((p) => p.collection),
    )
    expect(collections).toEqual(new Set(['interiors', 'exteriors', 'page']))

    // Seeded rows point at build-served paths, not uploads.
    expect(content.photos.every((p) => p.src.startsWith('/images/'))).toBe(true)

    // And it persisted, so the next boot does not reseed.
    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.photos.length).toBe(content.photos.length)
  })

  it('reseeds when content.json is malformed rather than crashing', async () => {
    await writeFile(join(dir, 'content.json'), '{ this is not json')
    const store = await freshStore()
    const content = await store.load()
    expect(content.photos.length).toBeGreaterThan(0)
  })

  it('persists mutations atomically and leaves no temp file', async () => {
    const store = await freshStore()
    await store.load()
    await store.mutate((c) => {
      c.photos.push({
        id: 'x',
        collection: 'page',
        src: '/uploads/x.webp',
        alt: '',
        caption: '',
        sortOrder: 999,
        createdAt: new Date().toISOString(),
      })
    })

    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.photos.some((p) => p.id === 'x')).toBe(true)

    await expect(readFile(join(dir, 'content.json.tmp'), 'utf8')).rejects.toThrow()
  })

  it('serialises overlapping mutations', async () => {
    const store = await freshStore()
    await store.load()
    const before = store.read().photos.length

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        store.mutate((c) => {
          const next = c.photos.length
          c.photos.push({
            id: `p${i}`,
            collection: 'page',
            src: `/uploads/${i}.webp`,
            alt: '',
            caption: '',
            sortOrder: next,
            createdAt: new Date().toISOString(),
          })
        }),
      ),
    )

    expect(store.read().photos.length).toBe(before + 20)
  })

  it('keeps accepting mutations after one throws', async () => {
    const store = await freshStore()
    await store.load()
    await expect(
      store.mutate(() => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    await expect(store.mutate((c) => c.photos.length)).resolves.toBeGreaterThan(0)
  })

  it('seeds the van range from the static content file', async () => {
    const store = await freshStore()
    const content = await store.load()

    expect(content.vans.heading).toBeTruthy()
    expect(content.vans.items.length).toBeGreaterThan(0)

    for (const van of content.vans.items) {
      expect(van.id).toBeTruthy()
      expect(van.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(Array.isArray(van.description)).toBe(true)
      expect(Array.isArray(van.specs)).toBe(true)
      // Gallery photos live in the photos array, never nested on the van.
      expect(van.photos).toBeUndefined()
    }

    const ids = content.vans.items.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('seeds each van gallery photo under its own van: collection', async () => {
    const store = await freshStore()
    const content = await store.load()

    const vanRows = content.photos.filter((p) => p.collection.startsWith('van:'))
    expect(vanRows.length).toBeGreaterThan(0)
    expect(vanRows.every((p) => p.src.startsWith('/images/'))).toBe(true)

    const known = new Set(content.vans.items.map((v) => `van:${v.id}`))
    expect(vanRows.every((p) => known.has(p.collection))).toBe(true)
  })

  it('migrates a content.json that predates vans without discarding uploads', async () => {
    const uploaded = {
      id: 'kept-photo',
      collection: 'page',
      src: '/uploads/kept.webp',
      alt: 'An upload the client made',
      caption: '',
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({ version: 1, photos: [uploaded], tours: [] }),
    )

    const store = await freshStore()
    const content = await store.load()

    // The migration backfills vans...
    expect(content.vans.items.length).toBeGreaterThan(0)
    // ...without rebuilding the file from scratch, which would orphan this.
    expect(content.photos.find((p) => p.id === 'kept-photo')).toEqual(uploaded)
    expect(content.tours).toEqual([])

    // And it persists, so the next boot does no work.
    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.vans.items.length).toBe(content.vans.items.length)
  })
})
