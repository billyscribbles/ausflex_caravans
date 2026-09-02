// Pull production's content store down into the local .data/ so `yarn dev`
// shows the site the client actually has — their uploaded hero shots, the vans
// they added in the dashboard, their captions and ordering — instead of the
// static seed in server/seed.js, which is where every fresh local store starts
// and why local and production show different images.
//
//   yarn pull:prod                      # from the production Railway URL
//   yarn pull:prod https://staging.url  # or anywhere else
//
// Read-only against the remote: it only ever GETs. Everything it writes lands
// in the local DATA_DIR.
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { SEED_VERSION } from '../server/seed.js'

const REMOTE = process.argv[2] ?? 'https://ausflexcaravans-production.up.railway.app'
const DATA_DIR = process.env.DATA_DIR || './.data'
const UPLOADS = join(DATA_DIR, 'uploads')

// This script overwrites content.json. That is the point locally and a
// catastrophe on a mounted volume, so refuse to aim it at one.
if (process.env.RAILWAY_ENVIRONMENT || resolve(DATA_DIR) === '/data') {
  console.error(`Refusing to run: DATA_DIR (${resolve(DATA_DIR)}) looks like a live volume.`)
  console.error('pull:prod overwrites content.json and is only ever meant to fill a local .data/.')
  process.exit(1)
}

const res = await fetch(new URL('/api/content', REMOTE))
if (!res.ok) {
  console.error(`GET ${REMOTE}/api/content -> ${res.status}`)
  process.exit(1)
}
const payload = await res.json()

// /api/content splits photos into the shape the site renders; the store keeps
// one flat array keyed by collection. Rebuild that, van galleries included.
const photos = [
  ...payload.gallery.interiors,
  ...payload.gallery.exteriors,
  ...payload.gallery.page,
  ...payload.vans.items.flatMap((van) => van.photos ?? []),
]

const store = {
  // Keep the remote's own version so the local store migrates exactly as
  // production will on its next deploy — that rehearsal is the whole point.
  // Older servers do not publish it; assume current rather than replaying
  // every migration against data that has already been through them.
  version: payload.version ?? SEED_VERSION,
  photos,
  tours: payload.tours,
  vans: {
    eyebrow: payload.vans.eyebrow,
    heading: payload.vans.heading,
    sub: payload.vans.sub,
    items: payload.vans.items.map((van) => {
      // `photos` is joined on by the route, not stored on the van record.
      const stored = { ...van }
      delete stored.photos
      return stored
    }),
  },
}

await mkdir(UPLOADS, { recursive: true })
await writeFile(join(DATA_DIR, 'content.json'), JSON.stringify(store, null, 2))

// Uploaded files live on the remote's volume and are not in this repo, so
// mirror the ones the store references. Skip what is already here: the names
// are content-unique UUIDs, so a local hit is always the same bytes.
const referenced = new Set()
for (const photo of photos) if (photo.src.startsWith('/uploads/')) referenced.add(photo.src)
for (const van of store.vans.items) {
  for (const src of [van.image, van.floorplan]) {
    if (typeof src === 'string' && src.startsWith('/uploads/')) referenced.add(src)
  }
}

let fetched = 0
let skipped = 0
let failed = 0
for (const src of referenced) {
  const target = join(DATA_DIR, src.replace(/^\//, ''))
  if (
    await readFile(target).then(
      () => true,
      () => false,
    )
  ) {
    skipped += 1
    continue
  }
  const file = await fetch(new URL(src, REMOTE))
  if (!file.ok) {
    console.warn(`  ! ${src} -> ${file.status}`)
    failed += 1
    continue
  }
  await writeFile(target, Buffer.from(await file.arrayBuffer()))
  fetched += 1
}

console.log(`Mirrored ${REMOTE} into ${resolve(DATA_DIR)}`)
console.log(
  `  store   v${store.version} · ${photos.length} photos · ${store.tours.length} tours · ${store.vans.items.length} vans`,
)
console.log(
  `  uploads ${fetched} downloaded, ${skipped} already local${failed ? `, ${failed} failed` : ''}`,
)
