// Builds the initial content.json from the static content files. Seeded photo
// rows point at /images/*, which dist/ already serves, so seeding copies no
// bytes — it just records what the site already ships.
import { randomUUID } from 'node:crypto'
import { gallery } from '../src/content/gallery.js'
import { tour } from '../src/content/tour.js'

const COLLECTIONS = ['interiors', 'exteriors', 'page']

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

  return { version: 1, photos, tours }
}
