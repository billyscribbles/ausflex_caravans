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

async function freshStore() {
  return await import('./store.js?' + Math.random())
}

describe('store', () => {
  it('seeds from the static content files when content.json is absent', async () => {
    const store = await freshStore()
    const content = await store.load()

    expect(content.version).toBe(1)
    expect(content.photos.length).toBeGreaterThan(0)
    expect(content.tours.length).toBeGreaterThan(0)

    const collections = new Set(content.photos.map((p) => p.collection))
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
})
