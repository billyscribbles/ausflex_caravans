// Builds the initial content.json from the static content files. Seeded photo
// rows point at /images/*, which dist/ already serves, so seeding copies no
// bytes — it just records what the site already ships.
import { randomUUID } from 'node:crypto'
import { gallery } from '../src/content/gallery.js'
import { tour } from '../src/content/tour.js'
import { vans } from '../src/content/vans.js'

const COLLECTIONS = ['interiors', 'exteriors', 'page']

// Bumped whenever the content files gain something a store seeded under an
// earlier version would never see. store.js migrates forward to this number.
export const SEED_VERSION = 6

// What v1 and v2 seeded the single Kuula collection as. v3 renames it, because
// the /360 picker now shows tour titles as its buttons and "Ausflex Caravans
// 360° virtual tour" says nothing next to a second van. Only a row still
// carrying this exact string is renamed, so a title the client set stands.
export const LEGACY_TOUR_TITLE = 'Ausflex Caravans 360° virtual tour'

// What v1–v3 seeded the on-site range's length as. The real ceiling is 32
// feet, not 30. v4 rewrites only text still carrying these exact phrases, so
// wording the client edited in the dashboard stands.
export const LEGACY_LENGTH_PHRASES = [
  ['up to 30 feet', 'up to 32 feet'],
  ['Up to 30ft', 'Up to 32ft'],
  ['Up to thirty feet', 'Up to thirty-two feet'],
]

// The tours shipped in the content files, for buildSeed and for the backfill
// in store.js.
export function seededTours(now = new Date().toISOString()) {
  return tour.items.map((item, i) => ({
    id: randomUUID(),
    title: item.title,
    embedUrl: item.src,
    poster: item.poster ?? null,
    sortOrder: i,
    createdAt: now,
  }))
}

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

// The walkthrough films shipped in the content files, keyed by van slug — for
// the v5 backfill in store.js. Fresh seeds pick them up through buildVans'
// field spread without going through here.
export function seededVanVideos() {
  return new Map(vans.items.filter((v) => v.video).map((v) => [v.slug, v.video]))
}

// What v1–v5 seeded beside each van's 3D layout render. The van pages show the
// render alone now — a stray camera photo under the plan read as clutter — so
// the v6 step in store.js retires exactly these rows. A photo the client
// uploaded lives under /uploads/ and can never match.
export const RETIRED_VAN_PHOTO_SRCS = [
  '/images/photo-little-wonder-front.jpg',
  '/images/photo-family-adventurer.jpg',
  '/images/photo-fierce-interior-1.jpg',
  '/images/photo-extreme-build.jpg',
]

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

  const seededVans = buildVans(now)
  photos.push(...seededVans.photos)

  return { version: SEED_VERSION, photos, tours: seededTours(now), vans: seededVans.vans }
}
