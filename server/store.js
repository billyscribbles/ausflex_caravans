// content.json lives on the Railway volume. Reads come from an in-memory cache;
// writes go through a single queue and land via write-temp-then-rename, so a
// crash mid-write can never leave a truncated file.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  buildSeed,
  buildVans,
  LEGACY_TOUR_TITLE,
  SEED_VERSION,
  seededCaptions,
  seededTours,
} from './seed.js'

const DATA_DIR = process.env.DATA_DIR || './.data'
const FILE = join(DATA_DIR, 'content.json')
const UPLOADS = join(DATA_DIR, 'uploads')

let cache = null
let queue = Promise.resolve()

export function uploadsDir() {
  return UPLOADS
}

export function read() {
  return cache
}

async function persist() {
  const tmp = `${FILE}.tmp`
  await writeFile(tmp, JSON.stringify(cache, null, 2))
  await rename(tmp, FILE)
}

function hasVans(parsed) {
  return Boolean(parsed?.vans) && Array.isArray(parsed.vans.items)
}

export async function load() {
  await mkdir(UPLOADS, { recursive: true })

  let parsed = null
  try {
    parsed = JSON.parse(await readFile(FILE, 'utf8'))
    if (!Array.isArray(parsed.photos) || !Array.isArray(parsed.tours)) parsed = null
  } catch {
    parsed = null
  }

  if (!parsed) {
    // Missing or corrupt — rebuild from the static content files rather than
    // booting with an empty site.
    cache = buildSeed()
    await persist()
    return cache
  }

  cache = parsed

  // A content.json written before vans existed passes the checks above, so it
  // would otherwise boot with an undefined range. Backfill it in place; a full
  // rebuild here would discard the client's uploaded photos.
  if (!hasVans(parsed)) {
    const seeded = buildVans()
    cache.vans = seeded.vans
    cache.photos = [
      ...cache.photos.filter((p) => !String(p.collection ?? '').startsWith('van:')),
      ...seeded.photos,
    ]
    await persist()
  }

  // Everything below runs once per version bump, never on a rebuild — a
  // rebuild here would discard the client's uploads and dashboard edits.
  if ((cache.version ?? 0) < SEED_VERSION) {
    // v2: photos seeded before their collection had captions carry an empty
    // one. Fill the blanks from the content files, but only the blanks, so a
    // caption the client deliberately clears in the dashboard stays cleared.
    const captions = seededCaptions()
    for (const photo of cache.photos) {
      if (!photo.caption && captions.has(photo.src)) photo.caption = captions.get(photo.src)
    }

    // v3: the content files ship more than one Kuula collection now. Match on
    // embed URL and append what is missing, so tours the client added keep
    // their place and order. A seeded tour the client deleted does come back —
    // same one-shot trade-off the caption backfill makes.
    let order = cache.tours.length ? Math.max(...cache.tours.map((t) => t.sortOrder)) + 1 : 0
    for (const seeded of seededTours()) {
      const match = cache.tours.find((t) => t.embedUrl === seeded.embedUrl)
      if (!match) {
        cache.tours.push({ ...seeded, sortOrder: order++ })
      } else if (match.title === LEGACY_TOUR_TITLE) {
        match.title = seeded.title
      }
    }

    cache.version = SEED_VERSION
    await persist()
  }

  return cache
}

export function mutate(fn) {
  const run = queue.then(async () => {
    const result = await fn(cache)
    await persist()
    return result
  })
  // Swallow rejection on the *chain* only, so one failed mutation does not
  // poison every mutation after it. The caller still sees the rejection.
  queue = run.then(
    () => {},
    () => {},
  )
  return run
}
