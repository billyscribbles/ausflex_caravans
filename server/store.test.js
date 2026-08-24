// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LEGACY_TOUR_TITLE, SEED_VERSION, seededCaptions, seededTours } from './seed.js'

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

    expect(content.version).toBe(SEED_VERSION)
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
    // A rebuild would also have reseeded the base gallery collections, so the
    // upload should still be the only photo outside the van rows just added.
    expect(content.photos.filter((p) => !p.collection.startsWith('van:'))).toEqual([uploaded])
    // The version bump does fill in the tours this file never had — that is
    // the v3 backfill running on top, not a rebuild.
    expect(content.tours.map((t) => t.embedUrl)).toEqual(seededTours().map((t) => t.embedUrl))

    // And it persists, so the next boot does no work.
    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.vans.items.length).toBe(content.vans.items.length)
  })

  it('backfills captions a store seeded under an older version never got', async () => {
    const [src, caption] = [...seededCaptions()][0]
    const stale = {
      id: 'stale-photo',
      collection: 'page',
      src,
      alt: 'Seeded before this collection had captions',
      caption: '',
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    // A caption the client cleared on purpose, on a photo they uploaded.
    const cleared = { ...stale, id: 'cleared-photo', src: '/uploads/theirs.webp', sortOrder: 1 }
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({ version: 1, photos: [stale, cleared], tours: [] }),
    )

    const store = await freshStore()
    const content = await store.load()

    expect(content.photos.find((p) => p.id === 'stale-photo').caption).toBe(caption)
    expect(content.photos.find((p) => p.id === 'cleared-photo').caption).toBe('')

    // Stamped and persisted, so the next boot leaves the client's edits alone.
    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.version).toBe(SEED_VERSION)
  })

  it('appends Kuula collections a store seeded under an older version never got', async () => {
    const seeded = seededTours()
    expect(seeded.length).toBeGreaterThan(1)

    const stale = {
      id: 'seeded-tour',
      title: LEGACY_TOUR_TITLE,
      embedUrl: seeded[0].embedUrl,
      poster: '/images/interior-galley.jpg',
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    // One the client added in the dashboard, under a title of their own.
    const theirs = {
      ...stale,
      id: 'their-tour',
      title: 'Our best build',
      embedUrl: 'https://kuula.co/share/collection/THEIRS',
      sortOrder: 1,
    }
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({ version: 2, photos: [], tours: [stale, theirs] }),
    )

    const store = await freshStore()
    const content = await store.load()

    // Every shipped collection is present...
    const urls = content.tours.map((t) => t.embedUrl)
    for (const t of seeded) expect(urls).toContain(t.embedUrl)
    // ...the client's own tour is untouched...
    expect(content.tours.find((t) => t.id === 'their-tour')).toEqual(theirs)
    // ...the stale seeded row is renamed in place rather than duplicated...
    expect(content.tours.filter((t) => t.embedUrl === seeded[0].embedUrl).length).toBe(1)
    expect(content.tours.find((t) => t.id === 'seeded-tour').title).toBe(seeded[0].title)
    // ...and the new one lands after everything already there, so the /360
    // picker does not reshuffle under the client.
    expect(content.tours.map((t) => t.sortOrder)).toEqual([0, 1, 2])

    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.version).toBe(SEED_VERSION)
    expect(onDisk.tours.length).toBe(content.tours.length)
  })

  it('leaves a seeded tour the client retitled alone', async () => {
    const seeded = seededTours()
    const renamed = seeded.map((t, i) => ({
      ...t,
      id: `tour-${i}`,
      title: `Their name ${i}`,
      createdAt: '2026-01-01T00:00:00.000Z',
    }))
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({ version: 2, photos: [], tours: renamed }),
    )

    const store = await freshStore()
    const content = await store.load()

    expect(content.tours).toEqual(renamed)
  })
})
