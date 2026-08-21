// content.json lives on the Railway volume. Reads come from an in-memory cache;
// writes go through a single queue and land via write-temp-then-rename, so a
// crash mid-write can never leave a truncated file.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildSeed } from './seed.js'

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

export async function load() {
  await mkdir(UPLOADS, { recursive: true })
  try {
    const parsed = JSON.parse(await readFile(FILE, 'utf8'))
    if (!Array.isArray(parsed.photos) || !Array.isArray(parsed.tours)) {
      throw new Error('malformed content.json')
    }
    cache = parsed
  } catch {
    // Missing or corrupt — rebuild from the static content files rather than
    // booting with an empty site.
    cache = buildSeed()
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
