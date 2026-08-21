import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const LIVE = {
  gallery: {
    interiors: [{ id: '1', src: '/uploads/a.webp', alt: 'Live interior', caption: '' }],
    exteriors: [{ id: '2', src: '/uploads/b.webp', alt: 'Live exterior', caption: '' }],
    page: [{ id: '3', src: '/uploads/c.webp', alt: 'Live page photo', caption: '' }],
  },
  tours: [{ id: '4', title: 'Live tour', embedUrl: 'https://kuula.co/share/x', poster: null }],
  vans: {
    eyebrow: 'Live eyebrow',
    heading: 'Live heading',
    sub: 'Live sub',
    items: [
      {
        id: '5',
        slug: 'live-van',
        name: 'Live Van',
        length: '20ft',
        tag: 'Live tag',
        meta: 'Live meta',
        blurb: 'Live blurb',
        description: ['Live paragraph.'],
        specs: ['Live spec'],
        image: '/uploads/live.webp',
        imageAlt: 'Live van',
        floorplan: null,
        floorplanAlt: '',
        photos: [],
        sortOrder: 0,
      },
    ],
  },
}

// The store fires its fetch at module scope, so the stub must be installed
// before the import — hence resetModules plus a dynamic import per test.
async function freshStore() {
  vi.resetModules()
  return await import('../lib/contentStore.js')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('contentStore', () => {
  it('serves live data once the request resolves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => LIVE }))
    const store = await freshStore()
    const { result } = renderHook(() => store.useContent())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.data.gallery.page[0].alt).toBe('Live page photo')
  })

  it('falls back to the static content files when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const store = await freshStore()
    const { result } = renderHook(() => store.useContent())

    await waitFor(() => expect(result.current.status).toBe('error'))
    // The site renders today's photos rather than an empty grid.
    expect(result.current.data.gallery.page.length).toBeGreaterThan(0)
    expect(result.current.data.tours[0].embedUrl).toContain('kuula.co')
  })

  it('falls back on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const store = await freshStore()
    const { result } = renderHook(() => store.useContent())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data.gallery.interiors.length).toBeGreaterThan(0)
  })

  it('falls back on a malformed payload rather than rendering nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nonsense: true }) }),
    )
    const store = await freshStore()
    const { result } = renderHook(() => store.useContent())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data.gallery.page.length).toBeGreaterThan(0)
  })

  it('useCollection reports loading then items', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => LIVE }))
    const store = await freshStore()
    const { result } = renderHook(() => store.useCollection('interiors'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items[0].alt).toBe('Live interior')
  })

  it('fires exactly one request no matter how many components subscribe', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => LIVE })
    vi.stubGlobal('fetch', spy)
    const store = await freshStore()

    renderHook(() => store.useContent())
    renderHook(() => store.useCollection('page'))
    renderHook(() => store.useTours())

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
  })
})

describe('useVans', () => {
  it('serves the live range once the request resolves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => LIVE }))
    const store = await freshStore()
    const { result } = renderHook(() => store.useVans())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.vans.heading).toBe('Live heading')
    expect(result.current.vans.items[0].slug).toBe('live-van')
  })

  it('falls back to the static van file when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const store = await freshStore()
    const { result } = renderHook(() => store.useVans())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.vans.items.length).toBeGreaterThan(0)
    expect(result.current.vans.items[0].slug).toBeTruthy()
  })

  // A rolling deploy can briefly pair an old server with a new client. Only the
  // van slice should degrade — not the gallery the old server answers fine.
  it('falls back per-slice when the payload omits vans', async () => {
    const { vans: _vans, ...withoutVans } = LIVE
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => withoutVans }))
    const store = await freshStore()

    const vansHook = renderHook(() => store.useVans())
    const galleryHook = renderHook(() => store.useCollection('page'))

    await waitFor(() => expect(vansHook.result.current.loading).toBe(false))
    expect(vansHook.result.current.vans.items[0].slug).toBeTruthy()
    // Gallery still came from the API, not the fallback.
    expect(galleryHook.result.current.items[0].alt).toBe('Live page photo')
  })
})
