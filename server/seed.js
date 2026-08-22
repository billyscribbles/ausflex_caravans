// Builds the initial content.json from the static content files. Seeded photo
// rows point at /images/*, which dist/ already serves, so seeding copies no
// bytes — it just records what the site already ships.
import { randomUUID } from 'node:crypto'
import { gallery } from '../src/content/gallery.js'
import { tour } from '../src/content/tour.js'
import { vans } from '../src/content/vans.js'

const COLLECTIONS = ['interiors', 'exteriors', 'page']

// Bumped whenever a shipped photo gains copy that a store seeded under an
// earlier version would never see. store.js migrates forward to this number.
export const SEED_VERSION = 2

// Captions keyed by src, for the backfill in store.js. Every seeded photo the
// content files caption is in here, whichever collection it belongs to.
export function seededCaptions() {
  const byCaption = new Map()
  for (const collection of COLLECTIONS) {
    for (const item of gallery[collection]?.items ?? []) {
      if (item.caption) byCaption.set(item.src, item.caption)
    }
  }
  return byCaption
}

// The van range, split into the two places it is stored: the van records
// themselves, and their gallery photos as ordinary rows in the photos array
// (so every existing photo route works on them unchanged).
export function buildVans(now = new Date().toISOString()) {
  const items = []
  const photos = []

  vans.items.forEach((van, i) => {
    const id = randomUUID()
    const { photos: gallery = [], ...fields } = van
    items.push({ ...fields, id, sortOrder: i, createdAt: now })

    gallery.forEach((photo, j) => {
      photos.push({
        id: randomUUID(),
        collection: `van:${id}`,
        src: photo.src,
        alt: photo.alt ?? '',
        caption: photo.caption ?? '',
        sortOrder: j,
        createdAt: now,
      })
    })
  })

  return {
    vans: { eyebrow: vans.eyebrow, heading: vans.heading, sub: vans.sub, items },
    photos,
  }
}

export function buildSeed() {
  const now = new Date().toISOString()
  const photos = []

  for (const collection of COLLECTIONS) {
    const items = gallery[collection]?.items ?? []
    items.forEach((item, i) => {
      photos.push({
        id: randomUUID(),
        collection,
        src: item.src,
        alt: item.alt ?? '',
        caption: item.caption ?? '',
        sortOrder: i,
        createdAt: now,
      })
    })
  }

  const tours = [
    {
      id: randomUUID(),
      title: tour.title,
      embedUrl: tour.src,
      poster: tour.poster ?? null,
      sortOrder: 0,
      createdAt: now,
    },
  ]

  const seededVans = buildVans(now)
  photos.push(...seededVans.photos)

  return { version: SEED_VERSION, photos, tours, vans: seededVans.vans }
}
