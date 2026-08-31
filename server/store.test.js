// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  LEGACY_TOUR_TITLE,
  RETIRED_VAN_PHOTO_SRCS,
  SEED_VERSION,
  seededCaptions,
  seededTours,
  seededVanVideos,
} from './seed.js'

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

  it('corrects the 30-foot on-site copy a store seeded under an older version still carries', async () => {
    const stale = {
      id: 'on-site-van',
      slug: 'on-site',
      name: 'On-Site Caravans',
      length: 'Up to 30ft',
      blurb: 'Custom-built on-site caravans designed around your unique needs, up to 30 feet.',
      description: ['Up to thirty feet, designed around your block and the way you will use it.'],
      specs: ['Up to 30ft', 'Custom layouts'],
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    // A van whose copy the client rewrote in the dashboard.
    const theirs = {
      ...stale,
      id: 'their-van',
      slug: 'tuff-mudder',
      length: '12ft',
      blurb: 'Their own words about their own van.',
      description: ['Their paragraph, untouched.'],
      specs: ['12ft body'],
      sortOrder: 1,
    }
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({
        version: 3,
        photos: [],
        tours: [],
        vans: {
          eyebrow: 'The Range',
          heading: 'A van for every adventure.',
          sub: 'From the 12-foot Tuff Mudder to on-site vans up to 30 feet — come and see them.',
          items: [stale, theirs],
        },
      }),
    )

    const store = await freshStore()
    const content = await store.load()

    expect(content.vans.sub).toContain('on-site vans up to 32 feet')
    const fixed = content.vans.items.find((v) => v.id === 'on-site-van')
    expect(fixed.length).toBe('Up to 32ft')
    expect(fixed.blurb).toContain('up to 32 feet')
    expect(fixed.description[0]).toContain('Up to thirty-two feet')
    expect(fixed.specs).toContain('Up to 32ft')
    expect(fixed.specs).not.toContain('Up to 30ft')
    // The client's own wording stands.
    expect(content.vans.items.find((v) => v.id === 'their-van')).toEqual(theirs)

    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.version).toBe(SEED_VERSION)
  })

  it('backfills the seeded walkthrough film onto vans from before videos existed', async () => {
    const seeded = seededVanVideos()
    expect(seeded.has('extreme-family')).toBe(true)

    const bare = {
      id: 'extreme-van',
      slug: 'extreme-family',
      name: 'Extreme Family',
      description: [],
      specs: [],
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    // A van already carrying its own film keeps it.
    const theirs = {
      ...bare,
      id: 'their-van',
      slug: 'tuff-mudder',
      video: { youtubeId: 'their-film', title: 'Their film' },
      sortOrder: 1,
    }
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({
        version: 4,
        photos: [],
        tours: [],
        vans: { eyebrow: '', heading: '', sub: '', items: [bare, theirs] },
      }),
    )

    const store = await freshStore()
    const content = await store.load()

    expect(content.vans.items.find((v) => v.id === 'extreme-van').video).toEqual(
      seeded.get('extreme-family'),
    )
    expect(content.vans.items.find((v) => v.id === 'their-van').video.youtubeId).toBe('their-film')

    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.version).toBe(SEED_VERSION)
  })

  it('retires the seeded camera photos from van galleries, and only those', async () => {
    const retiredSrc = RETIRED_VAN_PHOTO_SRCS[0]
    const seededCamera = {
      id: 'seeded-camera',
      collection: 'van:some-van',
      src: retiredSrc,
      alt: 'Camera photo an earlier seed placed beside the render',
      caption: 'Front toolbox & stone guard',
      sortOrder: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    // The render stays, an upload the client added to the same van stays, and
    // the same file sitting in a base gallery collection stays.
    const render = { ...seededCamera, id: 'render', src: '/images/van-little-wonder.jpg' }
    const uploaded = { ...seededCamera, id: 'their-upload', src: '/uploads/theirs.webp' }
    const inGallery = { ...seededCamera, id: 'gallery-copy', collection: 'exteriors' }
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({
        version: 5,
        photos: [seededCamera, render, uploaded, inGallery],
        tours: [],
        vans: { eyebrow: '', heading: '', sub: '', items: [] },
      }),
    )

    const store = await freshStore()
    const content = await store.load()

    const ids = content.photos.map((p) => p.id)
    expect(ids).not.toContain('seeded-camera')
    expect(ids).toEqual(expect.arrayContaining(['render', 'their-upload', 'gallery-copy']))

    const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
    expect(onDisk.version).toBe(SEED_VERSION)
  })

  it('does not redo older one-shot migrations when bumping past them', async () => {
    const [src] = [...seededCaptions()][0]
    // A seeded photo whose caption the client cleared after the v2 backfill
    // ran, and a tours list they emptied after the v3 append.
    const cleared = {
      id: 'cleared-seeded-photo',
      collection: 'page',
      src,
      alt: 'Seeded photo, caption cleared on purpose',
      caption: '',
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({
        version: 3,
        photos: [cleared],
        tours: [],
        vans: { eyebrow: '', heading: '', sub: '', items: [] },
      }),
    )

    const store = await freshStore()
    const content = await store.load()

    expect(content.photos.find((p) => p.id === 'cleared-seeded-photo').caption).toBe('')
    expect(content.tours).toEqual([])
  })
})

// The failure these cover cost the client two days of dashboard work: the
// service ran with no volume attached, so DATA_DIR fell back to ephemeral
// container disk and every deploy silently reseeded the site.
describe('durability', () => {
  const railwayKeys = ['RAILWAY_ENVIRONMENT', 'RAILWAY_VOLUME_MOUNT_PATH']

  afterEach(() => {
    for (const key of railwayKeys) delete process.env[key]
  })

  it('refuses to boot on Railway with no volume attached', async () => {
    process.env.RAILWAY_ENVIRONMENT = 'production'
    const store = await freshStore()
    await expect(store.load()).rejects.toThrow(/volume/i)
  })

  it('refuses to boot when DATA_DIR sits outside the mounted volume', async () => {
    process.env.RAILWAY_ENVIRONMENT = 'production'
    process.env.RAILWAY_VOLUME_MOUNT_PATH = join(dir, 'volume')
    process.env.DATA_DIR = join(dir, 'not-the-volume')
    const store = await freshStore()
    await expect(store.load()).rejects.toThrow(/ephemeral|outside/i)
  })

  it('boots when DATA_DIR is the mounted volume', async () => {
    process.env.RAILWAY_ENVIRONMENT = 'production'
    process.env.RAILWAY_VOLUME_MOUNT_PATH = dir
    const store = await freshStore()
    await expect(store.load()).resolves.toBeTruthy()
  })

  it('writes no backup on the very first boot, when there is nothing to keep', async () => {
    const store = await freshStore()
    await store.load()
    expect(await readdir(join(dir, 'backups')).catch(() => [])).toEqual([])
  })

  it('snapshots the existing content.json on every subsequent boot', async () => {
    const first = await freshStore()
    await first.load()
    await first.mutate((c) => {
      c.tours.push({
        id: 'theirs',
        title: 'Client tour',
        embedUrl: 'https://kuula.co/share/theirs',
        poster: null,
        sortOrder: 99,
        createdAt: new Date().toISOString(),
      })
    })

    vi.resetModules()
    const second = await freshStore()
    await second.load()

    const backups = await readdir(join(dir, 'backups'))
    expect(backups.length).toBe(1)
    const snapshot = JSON.parse(await readFile(join(dir, 'backups', backups[0]), 'utf8'))
    expect(snapshot.tours.some((t) => t.id === 'theirs')).toBe(true)
  })

  it('snapshots before a version migration runs, so a bad migration is recoverable', async () => {
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({ version: 1, photos: [], tours: [], vans: { heading: 'x', items: [] } }),
    )

    const store = await freshStore()
    await store.load()

    const backups = await readdir(join(dir, 'backups'))
    expect(backups.length).toBe(1)
    const snapshot = JSON.parse(await readFile(join(dir, 'backups', backups[0]), 'utf8'))
    // Pre-migration state: still v1, before store.js migrated it forward.
    expect(snapshot.version).toBe(1)
  })

  it('does not stack identical snapshots, so restart churn cannot evict real history', async () => {
    const first = await freshStore()
    await first.load()
    await first.mutate((c) => {
      c.tours.push({
        id: 'theirs',
        title: 'Client tour',
        embedUrl: 'https://kuula.co/share/theirs',
        poster: null,
        sortOrder: 99,
        createdAt: new Date().toISOString(),
      })
    })

    // Three boots with no edits between them: the client's state is worth one
    // snapshot, not three.
    for (let i = 0; i < 3; i++) {
      vi.resetModules()
      const boot = await freshStore()
      await boot.load()
    }

    expect((await readdir(join(dir, 'backups'))).length).toBe(1)
  })

  it('prunes backups to the retention limit, keeping the newest', async () => {
    // Seeding the directory directly rather than booting 35 times: the boots
    // are slow enough under a full parallel suite to time out neighbouring
    // test files, and the pruning logic is what this is actually about.
    await mkdir(join(dir, 'backups'), { recursive: true })
    const stale = []
    for (let i = 0; i < 35; i++) {
      const name = `content-2020-01-01T00-00-${String(i).padStart(2, '0')}.000Z-old.json`
      stale.push(name)
      await writeFile(join(dir, 'backups', name), JSON.stringify({ marker: i }))
    }

    // There has to be something on disk for the boot to snapshot.
    await writeFile(
      join(dir, 'content.json'),
      JSON.stringify({ version: SEED_VERSION, photos: [], tours: [], vans: { items: [] } }),
    )

    const store = await freshStore()
    await store.load()

    const backups = (await readdir(join(dir, 'backups'))).sort()
    expect(backups.length).toBe(store.BACKUP_RETENTION)
    // The oldest went first and the newest survived...
    expect(backups).not.toContain(stale[0])
    expect(backups).toContain(stale.at(-1))
    // ...and this boot's own snapshot is the newest of all.
    expect(backups.at(-1).startsWith('content-2020')).toBe(false)
  })

  it('preserves a malformed content.json instead of overwriting it with the seed', async () => {
    await writeFile(join(dir, 'content.json'), '{ this is not json')
    const store = await freshStore()
    await store.load()

    const quarantined = (await readdir(dir)).filter((f) => f.startsWith('content.corrupt-'))
    expect(quarantined.length).toBe(1)
    expect(await readFile(join(dir, quarantined[0]), 'utf8')).toBe('{ this is not json')
  })
})
