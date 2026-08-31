// content.json lives on the Railway volume. Reads come from an in-memory cache;
// writes go through a single queue and land via write-temp-then-rename, so a
// crash mid-write can never leave a truncated file.
import { readFile, writeFile, rename, mkdir, readdir, unlink } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  buildSeed,
  buildVans,
  LEGACY_LENGTH_PHRASES,
  LEGACY_TOUR_TITLE,
  RETIRED_VAN_PHOTO_SRCS,
  SEED_VERSION,
  seededCaptions,
  seededTours,
  seededVanVideos,
} from './seed.js'

const DATA_DIR = process.env.DATA_DIR || './.data'
const FILE = join(DATA_DIR, 'content.json')
const UPLOADS = join(DATA_DIR, 'uploads')
const BACKUPS = join(DATA_DIR, 'backups')

// Boots are rare (a deploy or a restart), the file is small, and it is the only
// copy of work the client cannot reproduce, so keep a long tail.
export const BACKUP_RETENTION = 30

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

// Railway's container filesystem is ephemeral. Without a volume the server
// still starts, still accepts uploads and still reports success — then the next
// deploy throws all of it away and reseeds, with nothing in the logs to say so.
// That silence cost the client two days of dashboard work, so a misconfigured
// service now refuses to start instead of pretending to save anything.
function assertDurableStorage() {
  if (!process.env.RAILWAY_ENVIRONMENT) return

  const mount = process.env.RAILWAY_VOLUME_MOUNT_PATH
  if (!mount) {
    throw new Error(
      'Refusing to boot: no Railway volume is attached to this service, so content.json and ' +
        'uploads/ would be written to ephemeral container disk and silently lost on the next ' +
        'deploy. Attach a volume mounted at /data and set DATA_DIR=/data — see docs/ENVIRONMENTS.md.',
    )
  }

  const data = resolve(DATA_DIR)
  const volume = resolve(mount)
  if (data !== volume && !data.startsWith(volume + sep)) {
    throw new Error(
      `Refusing to boot: DATA_DIR (${data}) is outside the mounted volume (${volume}), so it is ` +
        'ephemeral container disk and is lost on the next deploy. Point DATA_DIR at the volume ' +
        'mount path — see docs/ENVIRONMENTS.md.',
    )
  }
}

// Copy content.json aside before this boot touches it, so a deploy that
// migrates badly leaves the previous state recoverable rather than overwritten.
async function snapshot(raw) {
  await mkdir(BACKUPS, { recursive: true })

  // ':' is not portable in filenames. The ISO stamp still dominates the sort,
  // so a plain lexicographic sort is chronological; the uuid only breaks ties
  // between two boots inside the same millisecond.
  const existing = (await readdir(BACKUPS)).filter((f) => f.startsWith('content-')).sort()

  // A crashlooping or frequently-restarted container would otherwise write the
  // same bytes 30 times over and push every genuinely older state out of the
  // window. Snapshot only what differs from the newest one already held.
  const newest = existing.at(-1)
  if (newest) {
    const previous = await readFile(join(BACKUPS, newest), 'utf8').catch(() => null)
    if (previous === raw) return
  }

  const stamp = new Date().toISOString().replace(/:/g, '-')
  const name = `content-${stamp}-${randomUUID().slice(0, 8)}.json`
  await writeFile(join(BACKUPS, name), raw)

  const kept = [...existing, name].sort()
  for (const stale of kept.slice(0, Math.max(0, kept.length - BACKUP_RETENTION))) {
    await unlink(join(BACKUPS, stale)).catch(() => {})
  }
}

// An unreadable content.json is still the only record of the client's work —
// half of it may be salvageable by hand. Never let the reseed below be the
// thing that destroys it.
async function quarantine(raw) {
  const stamp = new Date().toISOString().replace(/:/g, '-')
  await writeFile(join(DATA_DIR, `content.corrupt-${stamp}.json`), raw)
}

function hasVans(parsed) {
  return Boolean(parsed?.vans) && Array.isArray(parsed.vans.items)
}

export async function load() {
  assertDurableStorage()
  await mkdir(UPLOADS, { recursive: true })

  let raw = null
  try {
    raw = await readFile(FILE, 'utf8')
  } catch {
    raw = null
  }

  let parsed = null
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw)
      if (!Array.isArray(parsed.photos) || !Array.isArray(parsed.tours)) parsed = null
    } catch {
      parsed = null
    }

    // A corrupt file goes to quarantine, not to backups/ — everything in
    // backups/ should be something you can restore by copying it back.
    if (parsed) await snapshot(raw)
    else await quarantine(raw)
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

  // Each step below runs only for stores seeded before that step's version,
  // never on a rebuild or a later bump — a store already past a step carries
  // the client's subsequent edits, and re-running the step would redo its
  // one-shot trade-offs against them.
  if ((cache.version ?? 0) < SEED_VERSION) {
    const from = cache.version ?? 0

    // v2: photos seeded before their collection had captions carry an empty
    // one. Fill the blanks from the content files, but only the blanks, so a
    // caption the client deliberately clears in the dashboard stays cleared.
    if (from < 2) {
      const captions = seededCaptions()
      for (const photo of cache.photos) {
        if (!photo.caption && captions.has(photo.src)) photo.caption = captions.get(photo.src)
      }
    }

    // v3: the content files ship more than one Kuula collection now. Match on
    // embed URL and append what is missing, so tours the client added keep
    // their place and order. A seeded tour the client deleted does come back —
    // same one-shot trade-off the caption backfill makes.
    if (from < 3) {
      let order = cache.tours.length ? Math.max(...cache.tours.map((t) => t.sortOrder)) + 1 : 0
      for (const seeded of seededTours()) {
        const match = cache.tours.find((t) => t.embedUrl === seeded.embedUrl)
        if (!match) {
          cache.tours.push({ ...seeded, sortOrder: order++ })
        } else if (match.title === LEGACY_TOUR_TITLE) {
          match.title = seeded.title
        }
      }
    }

    // v4: the on-site range tops out at 32 feet — earlier seeds said 30.
    // Rewrite only text still carrying the old phrases, so wording the client
    // edited in the dashboard stands.
    if (from < 4) {
      const fix = (text) => {
        if (typeof text !== 'string') return text
        for (const [stale, corrected] of LEGACY_LENGTH_PHRASES) {
          text = text.replaceAll(stale, corrected)
        }
        return text
      }
      cache.vans.sub = fix(cache.vans.sub)
      for (const van of cache.vans.items) {
        van.length = fix(van.length)
        van.blurb = fix(van.blurb)
        if (Array.isArray(van.description)) van.description = van.description.map(fix)
        if (Array.isArray(van.specs)) van.specs = van.specs.map(fix)
      }
    }

    // v5: some vans ship a walkthrough film now. Match on slug and fill only
    // vans without one, so a film the client somehow carries already stands —
    // and a seeded van whose slug the client changed simply stays filmless,
    // the same one-shot trade-off the tour append makes.
    if (from < 5) {
      const videos = seededVanVideos()
      for (const van of cache.vans.items) {
        if (!van.video && videos.has(van.slug)) van.video = videos.get(van.slug)
      }
    }

    // v6: the van pages show the 3D layout render alone now. Drop only the
    // exact camera photos earlier seeds placed beside it, and only from van
    // galleries — the same files could sit in the base gallery collections,
    // and a photo the client uploaded lives under /uploads/ so never matches.
    if (from < 6) {
      const retired = new Set(RETIRED_VAN_PHOTO_SRCS)
      cache.photos = cache.photos.filter(
        (p) => !(String(p.collection ?? '').startsWith('van:') && retired.has(p.src)),
      )
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
