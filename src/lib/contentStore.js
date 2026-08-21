// Live content from /api/content, with the static content files as the
// fallback. The request fires at module scope — not inside a useEffect — so it
// is in flight while React is still mounting rather than waterfalled behind it.
import { useSyncExternalStore } from 'react'
import { gallery } from '../content/gallery.js'
import { tour } from '../content/tour.js'

export const fallback = {
  gallery: {
    interiors: gallery.interiors.items,
    exteriors: gallery.exteriors.items,
    page: gallery.page.items,
  },
  tours: [
    {
      id: 'static',
      title: tour.title,
      embedUrl: tour.src,
      poster: tour.poster ?? null,
      sortOrder: 0,
    },
  ],
}

let state = { status: 'loading', data: null }
const listeners = new Set()

function set(next) {
  state = next
  for (const listener of listeners) listener()
}

function isWellFormed(json) {
  return (
    Boolean(json?.gallery?.interiors && json?.gallery?.exteriors && json?.gallery?.page) &&
    Array.isArray(json.tours)
  )
}

if (typeof fetch !== 'undefined') {
  fetch('/api/content')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then((json) => {
      if (!isWellFormed(json)) throw new Error('malformed payload')
      set({ status: 'ready', data: json })
    })
    // Never leave the site with an empty gallery — render what the build ships.
    .catch(() => set({ status: 'error', data: fallback }))
} else {
  state = { status: 'error', data: fallback }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useContent() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useCollection(name) {
  const { status, data } = useContent()
  return { loading: status === 'loading', items: data ? data.gallery[name] : [] }
}

export function useTours() {
  const { status, data } = useContent()
  return { loading: status === 'loading', tours: data ? data.tours : [] }
}
