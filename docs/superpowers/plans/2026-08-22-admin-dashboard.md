# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Ausflex staff a password-protected `/admin` dashboard that manages the three gallery photo collections and a list of 360° tour embeds, publishing to the live site with no redeploy.

**Architecture:** An Express server replaces `vite preview` as the production process, serving `dist/`, the SPA fallback, `/uploads/*` from a Railway volume, and a small JSON-backed `/api`. Metadata lives in one atomically-written `content.json` on the volume, seeded on first boot from the existing static content files so nothing has to be migrated. Public pages fetch `/api/content` same-origin at module scope and fall back to the static files if it fails.

**Tech Stack:** Node 20, Express 4, multer, cookie-parser, `node:crypto` (scrypt + HMAC — no native modules), React 18, Vite 5, Vitest + supertest, Yarn 4 PnP.

**Spec:** `docs/superpowers/specs/2026-08-22-admin-dashboard-design.md`

## Global Constraints

- **No new design tokens, no raw hex/rem in component CSS.** Add to `src/config/theme.config.js` and expose via `applyTheme.js`. (`CLAUDE.md`)
- **No TypeScript, no Tailwind, no styled-components.** JSX + plain CSS with CSS variables.
- **No native-module dependencies.** Only `express`, `multer`, `cookie-parser` are added to `dependencies`; `supertest` to `devDependencies`. Yarn PnP + Nixpacks makes native builds fragile.
- **All Node invocations use `yarn node`,** never bare `node` — PnP will not resolve otherwise.
- **Never delete the static content files.** `src/content/gallery.js` and `src/content/tour.js` remain as the seed source and the runtime error fallback.
- **CI must stay green:** `yarn lint && yarn format:check && yarn test && yarn build`, plus Lighthouse on `/` at performance ≥ 0.90, a11y ≥ 0.90, SEO ≥ 0.95.
- **The server must boot with no `ADMIN_PASSWORD_HASH` set** (logins always fail) so CI needs no secrets.
- Node version floor: 20 (`.nvmrc`).

## File Structure

**Server (new)**

| File                        | Responsibility                                                             |
| --------------------------- | -------------------------------------------------------------------------- |
| `server/seed.js`            | Build the initial `content.json` shape from the static content files       |
| `server/store.js`           | Load/cache `content.json`, atomic persist, serialised mutation queue       |
| `server/auth.js`            | scrypt hashing, HMAC session tokens, login rate limiter                    |
| `server/validate.js`        | Embed-URL allowlist, MIME→extension mapping                                |
| `server/app.js`             | Express app assembly (exported without `listen` so supertest can mount it) |
| `server/index.js`           | Loads the store, starts `app.listen`                                       |
| `server/routes/content.js`  | `GET /api/content` (public)                                                |
| `server/routes/auth.js`     | login / logout / session                                                   |
| `server/routes/photos.js`   | photo CRUD, reorder, upload                                                |
| `server/routes/tours.js`    | tour CRUD, reorder                                                         |
| `scripts/hash-password.mjs` | One-off password hash generator                                            |

**Client (new)**

| File                       | Responsibility                                                             |
| -------------------------- | -------------------------------------------------------------------------- |
| `src/lib/contentStore.js`  | Module-scope fetch of `/api/content`, static fallback, `useContent()` hook |
| `src/admin/api.js`         | Typed-ish fetch wrappers for every `/api` route                            |
| `src/admin/resizeImage.js` | Canvas resize + WebP encode before upload                                  |
| `src/admin/Login.jsx`      | Password form                                                              |
| `src/admin/PhotosTab.jsx`  | Collection switcher, dropzone, photo rows                                  |
| `src/admin/ToursTab.jsx`   | Tour rows + add form + export button                                       |
| `src/admin/admin.css`      | All admin styling, built on existing theme tokens                          |
| `src/pages/AdminPage.jsx`  | Shell: session check, login-vs-dashboard, tab state                        |

**Modified**

`src/App.jsx` (layout split + `/admin` route) · `src/pages/Home.jsx` · `src/pages/GalleryPage.jsx` · `src/pages/TourPage.jsx` · `src/components/GalleryGrid.jsx` · `src/components/InteriorsRail.jsx` · `src/components/VirtualTour.jsx` · `vite.config.js` · `package.json` · `.env.example` · `.gitignore` · `public/robots.txt` · `public/sitemap.xml`

**Tests**

`server/*.test.js` (node environment via docblock) · `src/test/contentStore.test.js` · `src/test/admin.test.jsx`

---

### Task 1: Content store and seeding

The foundation everything else reads and writes. No HTTP yet.

**Files:**

- Create: `server/seed.js`, `server/store.js`, `server/store.test.js`
- Modify: `vite.config.js` (Vitest `include`), `.gitignore`

**Interfaces:**

- Consumes: `gallery` from `src/content/gallery.js`, `tour` from `src/content/tour.js`
- Produces:
  - `buildSeed(): { version: 1, photos: Photo[], tours: Tour[] }`
  - `load(): Promise<Content>` — seeds and persists if the file is missing or malformed
  - `read(): Content` — synchronous, from cache
  - `mutate(fn: (content) => any): Promise<any>` — serialised, persists after `fn`
  - `uploadsDir(): string`
  - `Photo = { id, collection, src, alt, caption, sortOrder, createdAt }`
  - `Tour = { id, title, embedUrl, poster, sortOrder, createdAt }`

- [ ] **Step 1: Add `.data` to `.gitignore` and widen the Vitest include**

In `.gitignore`, after the `.vite` line:

```
.data
```

In `vite.config.js`, change the `test.include` line to:

```js
    include: ['src/**/*.{test,spec}.{js,jsx}', 'server/**/*.test.js'],
```

- [ ] **Step 2: Write the failing store test**

Create `server/store.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
  return await import('./store.js')
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
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `yarn vitest run server/store.test.js`
Expected: FAIL — `Cannot find module './store.js'`

- [ ] **Step 4: Write `server/seed.js`**

```js
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
```

- [ ] **Step 5: Write `server/store.js`**

```js
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
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `yarn vitest run server/store.test.js`
Expected: PASS, 5 tests

- [ ] **Step 7: Confirm the existing suite is untouched**

Run: `yarn test`
Expected: PASS — all pre-existing suites plus the new one

- [ ] **Step 8: Commit**

```bash
git add server/seed.js server/store.js server/store.test.js vite.config.js .gitignore
git commit -m "feat(server): content store with atomic writes and first-boot seeding"
```

---

### Task 2: Auth primitives

Pure functions — no Express yet, so every branch is cheap to test.

**Files:**

- Create: `server/auth.js`, `server/auth.test.js`, `scripts/hash-password.mjs`

**Interfaces:**

- Produces:
  - `hashPassword(password: string): Promise<string>` — returns `"<saltHex>:<keyHex>"`
  - `verifyPassword(password: string, stored: string): Promise<boolean>`
  - `signSession(secret: string, now?: number): string` — returns `"<expMs>.<sigHex>"`
  - `verifySession(token: string, secret: string, now?: number): boolean`
  - `rateLimit(ip: string, now?: number): boolean` — `false` once the window is exhausted
  - `resetRateLimit(): void` — test hook

- [ ] **Step 1: Write the failing test**

Create `server/auth.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  rateLimit,
  resetRateLimit,
} from './auth.js'

describe('password hashing', () => {
  it('round-trips the correct password', async () => {
    const stored = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('correct horse battery staple', stored)).resolves.toBe(true)
  })

  it('rejects the wrong password', async () => {
    const stored = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('wrong', stored)).resolves.toBe(false)
  })

  it('salts, so the same password hashes differently each time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })

  it('returns false rather than throwing when no hash is configured', async () => {
    await expect(verifyPassword('anything', undefined)).resolves.toBe(false)
    await expect(verifyPassword('anything', '')).resolves.toBe(false)
    await expect(verifyPassword('anything', 'garbage-no-colon')).resolves.toBe(false)
  })
})

describe('session tokens', () => {
  const secret = 'test-secret'

  it('accepts a token it just signed', () => {
    expect(verifySession(signSession(secret), secret)).toBe(true)
  })

  it('rejects a token signed with a different secret', () => {
    expect(verifySession(signSession('other-secret'), secret)).toBe(false)
  })

  it('rejects a tampered expiry', () => {
    const token = signSession(secret)
    const [, sig] = token.split('.')
    const forged = `${Date.now() + 999999999}.${sig}`
    expect(verifySession(forged, secret)).toBe(false)
  })

  it('rejects an expired token', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    expect(verifySession(signSession(secret, eightDaysAgo), secret)).toBe(false)
  })

  it('rejects junk without throwing', () => {
    expect(verifySession(undefined, secret)).toBe(false)
    expect(verifySession('', secret)).toBe(false)
    expect(verifySession('no-dot', secret)).toBe(false)
    expect(verifySession('123.zzzz', secret)).toBe(false)
  })
})

describe('login rate limiting', () => {
  beforeEach(() => resetRateLimit())

  it('allows 10 attempts then blocks', () => {
    for (let i = 0; i < 10; i++) expect(rateLimit('1.2.3.4')).toBe(true)
    expect(rateLimit('1.2.3.4')).toBe(false)
  })

  it('tracks each IP separately', () => {
    for (let i = 0; i < 10; i++) rateLimit('1.2.3.4')
    expect(rateLimit('5.6.7.8')).toBe(true)
  })

  it('forgets attempts once the window passes', () => {
    const t0 = Date.now()
    for (let i = 0; i < 10; i++) rateLimit('1.2.3.4', t0)
    expect(rateLimit('1.2.3.4', t0)).toBe(false)
    expect(rateLimit('1.2.3.4', t0 + 16 * 60 * 1000)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run server/auth.test.js`
Expected: FAIL — `Cannot find module './auth.js'`

- [ ] **Step 3: Write `server/auth.js`**

```js
// Shared-password auth. scrypt and HMAC come from node:crypto so nothing here
// needs a native module — bcrypt and jsonwebtoken are deliberately avoided.
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LEN = 64
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX = 10

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await scryptAsync(password, salt, KEY_LEN)
  return `${salt}:${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, keyHex] = stored.split(':')
  let expected
  try {
    expected = Buffer.from(keyHex, 'hex')
  } catch {
    return false
  }
  if (expected.length !== KEY_LEN) return false
  const actual = await scryptAsync(password, salt, KEY_LEN)
  return timingSafeEqual(expected, actual)
}

export function signSession(secret, now = Date.now()) {
  const exp = String(now + SESSION_TTL_MS)
  const sig = createHmac('sha256', secret).update(exp).digest('hex')
  return `${exp}.${sig}`
}

export function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return false
  const [exp, sig] = token.split('.')
  const expected = createHmac('sha256', secret).update(exp).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  // timingSafeEqual throws on length mismatch, so gate on length first.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  return Number(exp) > now
}

// In-memory, per-IP. With a single shared password this is the only barrier
// between the internet and write access, so it is load-bearing.
const attempts = new Map()

export function rateLimit(ip, now = Date.now()) {
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) {
    attempts.set(ip, recent)
    return false
  }
  recent.push(now)
  attempts.set(ip, recent)
  return true
}

export function resetRateLimit() {
  attempts.clear()
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `yarn vitest run server/auth.test.js`
Expected: PASS, 12 tests

- [ ] **Step 5: Write the password hash generator**

Create `scripts/hash-password.mjs`:

```js
// One-off: generate the ADMIN_PASSWORD_HASH value for Railway.
//   yarn node scripts/hash-password.mjs 'the-password'
// The plaintext never enters the repo — only the hash is stored, in Railway's
// environment variables.
import { hashPassword } from '../server/auth.js'

const password = process.argv[2]
if (!password) {
  console.error("Usage: yarn node scripts/hash-password.mjs '<password>'")
  process.exit(1)
}

console.log(await hashPassword(password))
```

- [ ] **Step 6: Verify it round-trips end to end**

Run: `yarn node scripts/hash-password.mjs 'test-password-123'`
Expected: a `<32 hex chars>:<128 hex chars>` string on stdout.

- [ ] **Step 7: Commit**

```bash
git add server/auth.js server/auth.test.js scripts/hash-password.mjs
git commit -m "feat(server): scrypt password auth, HMAC sessions, login rate limiting"
```

---

### Task 3: Input validation

**Files:**

- Create: `server/validate.js`, `server/validate.test.js`

**Interfaces:**

- Produces:
  - `isValidEmbedUrl(value: string): boolean`
  - `extForMime(mime: string): string | null` — `'webp' | 'jpg' | 'png' | null`
  - `MAX_UPLOAD_BYTES: number`

- [ ] **Step 1: Write the failing test**

Create `server/validate.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isValidEmbedUrl, extForMime, MAX_UPLOAD_BYTES } from './validate.js'

describe('isValidEmbedUrl', () => {
  it('accepts the vendors we embed', () => {
    expect(isValidEmbedUrl('https://kuula.co/share/collection/7T3NS?fs=1')).toBe(true)
    expect(isValidEmbedUrl('https://my.matterport.com/show/?m=abc')).toBe(true)
  })

  it('rejects script and data URLs', () => {
    // This value lands in an <iframe src>, so these are the cases that matter.
    expect(isValidEmbedUrl('javascript:alert(1)')).toBe(false)
    expect(isValidEmbedUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('rejects plain http', () => {
    expect(isValidEmbedUrl('http://kuula.co/share/collection/7T3NS')).toBe(false)
  })

  it('rejects hosts outside the allowlist', () => {
    expect(isValidEmbedUrl('https://evil.example.com/x')).toBe(false)
  })

  it('is not fooled by an allowlisted host as a prefix or as userinfo', () => {
    expect(isValidEmbedUrl('https://kuula.co.evil.com/x')).toBe(false)
    expect(isValidEmbedUrl('https://evilkuula.co/x')).toBe(false)
    expect(isValidEmbedUrl('https://kuula.co@evil.example.com/x')).toBe(false)
  })

  it('rejects junk without throwing', () => {
    expect(isValidEmbedUrl('')).toBe(false)
    expect(isValidEmbedUrl(undefined)).toBe(false)
    expect(isValidEmbedUrl('not a url')).toBe(false)
  })
})

describe('extForMime', () => {
  it('maps the image types we accept', () => {
    expect(extForMime('image/webp')).toBe('webp')
    expect(extForMime('image/jpeg')).toBe('jpg')
    expect(extForMime('image/png')).toBe('png')
  })

  it('returns null for anything else', () => {
    expect(extForMime('text/html')).toBe(null)
    expect(extForMime('image/svg+xml')).toBe(null) // SVG can carry script
    expect(extForMime(undefined)).toBe(null)
  })
})

describe('MAX_UPLOAD_BYTES', () => {
  it('is 8MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(8 * 1024 * 1024)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run server/validate.test.js`
Expected: FAIL — `Cannot find module './validate.js'`

- [ ] **Step 3: Write `server/validate.js`**

```js
// Tour embed URLs land in an <iframe src>, so they are validated against a
// host allowlist rather than merely parsed. Only an authenticated user can set
// one, but the check costs five lines.
const TOUR_HOSTS = ['kuula.co', 'matterport.com']

// SVG is deliberately absent: it can carry script and we serve uploads from
// our own origin.
const MIME_EXT = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export function isValidEmbedUrl(value) {
  if (typeof value !== 'string' || value === '') return false
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  // Userinfo can disguise the real host ("https://kuula.co@evil.com"), so
  // anything with credentials is refused outright.
  if (url.username || url.password) return false
  return TOUR_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
}

export function extForMime(mime) {
  return MIME_EXT[mime] ?? null
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `yarn vitest run server/validate.test.js`
Expected: PASS, 10 tests

- [ ] **Step 5: Commit**

```bash
git add server/validate.js server/validate.test.js
git commit -m "feat(server): embed-URL allowlist and upload MIME validation"
```

---

### Task 4: Express app, public content route, and the process swap

This is the task that takes production off `vite preview`. It must land whole or the site does not boot.

**Files:**

- Create: `server/app.js`, `server/index.js`, `server/routes/content.js`, `server/api.test.js`
- Modify: `package.json` (deps + `start` + `dev:api`), `vite.config.js` (remove `preview`, add `server.proxy`)

**Interfaces:**

- Consumes: `read`, `load`, `uploadsDir` from `server/store.js`
- Produces:
  - `createApp(): express.Application` — no `listen`, so supertest can mount it
  - `GET /api/content` → `{ gallery: { interiors: Photo[], exteriors: Photo[], page: Photo[] }, tours: Tour[] }`, each array sorted by `sortOrder`

- [ ] **Step 1: Add the dependencies**

Run:

```bash
yarn add express@^4.19.2 multer@^1.4.5-lts.1 cookie-parser@^1.4.6
yarn add -D supertest@^7.0.0
```

Express is pinned to v4 deliberately. Express 5 rewrote path matching and
`app.get('*')` — used for the SPA fallback below — is invalid syntax there.

- [ ] **Step 2: Write the failing API test**

Create `server/api.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let dir
let app

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-api-'))
  process.env.DATA_DIR = dir
  vi.resetModules()
  const store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  app = createApp()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('GET /api/content', () => {
  it('returns the three collections and the tours', async () => {
    const res = await request(app).get('/api/content').expect(200)

    expect(Object.keys(res.body.gallery).sort()).toEqual(['exteriors', 'interiors', 'page'])
    expect(res.body.gallery.page.length).toBeGreaterThan(0)
    expect(res.body.tours.length).toBeGreaterThan(0)
    expect(res.body.tours[0].embedUrl).toContain('kuula.co')
  })

  it('sorts each collection by sortOrder', async () => {
    const res = await request(app).get('/api/content').expect(200)
    const orders = res.body.gallery.page.map((p) => p.sortOrder)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('is cacheable and honours If-None-Match', async () => {
    const first = await request(app).get('/api/content').expect(200)
    expect(first.headers['cache-control']).toContain('max-age=60')

    const etag = first.headers.etag
    expect(etag).toBeTruthy()

    await request(app).get('/api/content').set('If-None-Match', etag).expect(304)
  })
})

describe('security headers', () => {
  it('sets the four headers the preview server used to set', async () => {
    const res = await request(app).get('/api/content')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(res.headers['permissions-policy']).toContain('camera=()')
  })

  it('does not advertise Express', async () => {
    const res = await request(app).get('/api/content')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})

describe('unknown API routes', () => {
  it('404 rather than falling through to the SPA', async () => {
    await request(app).get('/api/nope').expect(404)
  })
})
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `yarn vitest run server/api.test.js`
Expected: FAIL — `Cannot find module './app.js'`

- [ ] **Step 4: Write `server/routes/content.js`**

```js
import { Router } from 'express'
import { createHash } from 'node:crypto'
import { read } from '../store.js'

const router = Router()

// One payload for the whole site: three photo collections plus the tour list.
// Served from memory, so this is cheap enough to hit on every page load.
router.get('/content', (req, res) => {
  const content = read()
  const byOrder = (a, b) => a.sortOrder - b.sortOrder
  const of = (collection) => content.photos.filter((p) => p.collection === collection).sort(byOrder)

  const body = JSON.stringify({
    gallery: {
      interiors: of('interiors'),
      exteriors: of('exteriors'),
      page: of('page'),
    },
    tours: [...content.tours].sort(byOrder),
  })

  const etag = `W/"${createHash('sha1').update(body).digest('hex')}"`
  res.set('Cache-Control', 'public, max-age=60')
  res.set('ETag', etag)
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end()
    return
  }
  res.type('application/json').send(body)
})

export default router
```

- [ ] **Step 5: Write `server/app.js`**

```js
import express from 'express'
import cookieParser from 'cookie-parser'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { uploadsDir } from './store.js'
import contentRoutes from './routes/content.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(root, 'dist')

export function createApp() {
  const app = express()

  // Railway terminates TLS upstream, so req.ip only reflects the real client
  // when Express trusts the proxy. The login rate limiter keys on req.ip.
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(express.json({ limit: '256kb' }))
  app.use(cookieParser())

  // Ported verbatim from the vite.config.js preview block, which this server
  // replaces. CSP and HSTS stay omitted for the reasons noted there.
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    })
    next()
  })

  app.use('/api', contentRoutes)

  // Upload filenames are content-unique UUIDs, so an edited photo is always a
  // new URL and `immutable` can never serve a stale image.
  app.use(
    '/uploads',
    express.static(uploadsDir(), { immutable: true, maxAge: '1y', fallthrough: false }),
  )

  app.use(express.static(DIST, { index: false }))

  // SPA history fallback. /api and /uploads are excluded so a typo in an API
  // path returns 404 instead of silently serving index.html.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      next()
      return
    }
    res.sendFile(join(DIST, 'index.html'))
  })

  return app
}
```

- [ ] **Step 6: Write `server/index.js`**

```js
import { load } from './store.js'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 4173

await load()

createApp().listen(PORT, '0.0.0.0', () => {
  // The "localhost:4173" substring is load-bearing: it is what
  // lighthouserc.json's startServerReadyPattern waits for.
  console.log(`Ausflex server listening on http://localhost:${PORT}`)
})
```

- [ ] **Step 7: Run the API tests and confirm they pass**

Run: `yarn vitest run server/api.test.js`
Expected: PASS, 6 tests

- [ ] **Step 8: Swap the process over**

In `package.json`, change `start` and add `dev:api`:

```json
    "start": "yarn node server/index.js",
    "dev:api": "PORT=3001 DATA_DIR=./.data yarn node server/index.js",
```

In `vite.config.js`, delete the entire `preview: { ... }` block and add a `server` block in its place:

```js
  server: {
    // `yarn dev` serves the SPA; the API and uploads come from `yarn dev:api`.
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
```

- [ ] **Step 9: Verify the real server boots and serves the built site**

Run:

```bash
yarn build && yarn start
```

Expected: logs `Ausflex server listening on http://localhost:4173`.
Then, in another terminal:

```bash
curl -s localhost:4173/api/content | head -c 200
curl -s -o /dev/null -w '%{http_code}\n' localhost:4173/gallery
curl -s -o /dev/null -w '%{http_code}\n' localhost:4173/api/nope
```

Expected: JSON; `200` for the SPA route; `404` for the bad API path. Stop the server.

- [ ] **Step 10: Commit**

```bash
git add server/ package.json vite.config.js yarn.lock
git commit -m "feat(server): express app serving dist, uploads and /api/content"
```

---

### Task 5: Auth routes

**Files:**

- Create: `server/routes/auth.js`, `server/auth.routes.test.js`
- Modify: `server/app.js` (mount + `requireAuth` export)

**Interfaces:**

- Produces:
  - `POST /api/auth/login` `{ password }` → 200 `{ ok: true }` + `ausflex_session` cookie · 401 wrong · 429 rate-limited
  - `GET /api/auth/session` → `{ authed: boolean }`
  - `POST /api/auth/logout` → 200, clears the cookie
  - `requireAuth` middleware (exported from `server/routes/auth.js`) — 401 `{ error: 'unauthorised' }` when the cookie is missing or invalid

- [ ] **Step 1: Write the failing test**

Create `server/auth.routes.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PASSWORD = 'test-password-123'
let dir
let app

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-auth-'))
  process.env.DATA_DIR = dir
  process.env.SESSION_SECRET = 'test-session-secret'
  vi.resetModules()

  const { hashPassword, resetRateLimit } = await import('./auth.js')
  process.env.ADMIN_PASSWORD_HASH = await hashPassword(PASSWORD)
  resetRateLimit()

  const store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  app = createApp()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
  delete process.env.ADMIN_PASSWORD_HASH
})

describe('POST /api/auth/login', () => {
  it('accepts the right password and sets an HttpOnly cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: PASSWORD }).expect(200)

    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/ausflex_session=/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Strict/)
  })

  it('rejects the wrong password without setting a cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'nope' }).expect(401)
    expect(res.headers['set-cookie']).toBeUndefined()
  })

  it('rate-limits after 10 failed attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').send({ password: 'nope' })
    }
    await request(app).post('/api/auth/login').send({ password: PASSWORD }).expect(429)
  })
})

describe('session lifecycle', () => {
  it('reports authed:false before login and true after', async () => {
    const anon = await request(app).get('/api/auth/session').expect(200)
    expect(anon.body.authed).toBe(false)

    const login = await request(app).post('/api/auth/login').send({ password: PASSWORD })
    const cookie = login.headers['set-cookie']

    const authed = await request(app).get('/api/auth/session').set('Cookie', cookie).expect(200)
    expect(authed.body.authed).toBe(true)
  })

  it('logout clears the session', async () => {
    const login = await request(app).post('/api/auth/login').send({ password: PASSWORD })
    const cookie = login.headers['set-cookie']

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200)

    const after = await request(app)
      .get('/api/auth/session')
      .set('Cookie', ['ausflex_session='])
      .expect(200)
    expect(after.body.authed).toBe(false)
  })

  it('rejects a forged cookie', async () => {
    const res = await request(app)
      .get('/api/auth/session')
      .set('Cookie', [`ausflex_session=${Date.now() + 999999}.deadbeef`])
      .expect(200)
    expect(res.body.authed).toBe(false)
  })
})

describe('when no password is configured', () => {
  it('boots and refuses every login rather than crashing', async () => {
    delete process.env.ADMIN_PASSWORD_HASH
    vi.resetModules()
    const store = await import('./store.js')
    await store.load()
    const { createApp } = await import('./app.js')
    const bare = createApp()

    await request(bare).post('/api/auth/login').send({ password: 'anything' }).expect(401)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run server/auth.routes.test.js`
Expected: FAIL — 404 on `/api/auth/login`

- [ ] **Step 3: Write `server/routes/auth.js`**

```js
import { Router } from 'express'
import { verifyPassword, signSession, verifySession, rateLimit } from '../auth.js'

const COOKIE = 'ausflex_session'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Read at call time, not module scope, so tests can vary the environment.
const secret = () => process.env.SESSION_SECRET || 'insecure-dev-secret'

export function isAuthed(req) {
  return verifySession(req.cookies?.[COOKIE], secret())
}

export function requireAuth(req, res, next) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'unauthorised' })
    return
  }
  next()
}

const router = Router()

router.post('/login', async (req, res) => {
  if (!rateLimit(req.ip)) {
    res.status(429).json({ error: 'too many attempts, try again in 15 minutes' })
    return
  }

  const ok = await verifyPassword(req.body?.password ?? '', process.env.ADMIN_PASSWORD_HASH)
  if (!ok) {
    res.status(401).json({ error: 'incorrect password' })
    return
  }

  res.cookie(COOKIE, signSession(secret()), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
    path: '/',
  })
  res.json({ ok: true })
})

router.get('/session', (req, res) => {
  res.json({ authed: isAuthed(req) })
})

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE, { path: '/' })
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 4: Mount it in `server/app.js`**

Add the import beside the existing `contentRoutes` import:

```js
import authRoutes from './routes/auth.js'
```

and mount it directly after `app.use('/api', contentRoutes)`:

```js
app.use('/api/auth', authRoutes)
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `yarn vitest run server/auth.routes.test.js`
Expected: PASS, 7 tests

- [ ] **Step 6: Commit**

```bash
git add server/routes/auth.js server/auth.routes.test.js server/app.js
git commit -m "feat(server): login, session and logout routes"
```

---

### Task 6: Photo routes

**Files:**

- Create: `server/routes/photos.js`, `server/photos.routes.test.js`
- Modify: `server/app.js` (mount)

**Interfaces:**

- Consumes: `requireAuth` from `server/routes/auth.js`; `read`, `mutate`, `uploadsDir` from `server/store.js`; `extForMime`, `MAX_UPLOAD_BYTES` from `server/validate.js`
- Produces:
  - `POST /api/photos` — multipart, field `file`, plus `collection`, `alt`, `caption` → 201 `{ photo }`
  - `PATCH /api/photos/:id` `{ alt?, caption?, collection? }` → 200 `{ photo }`
  - `POST /api/photos/reorder` `{ collection, ids: string[] }` → 200 `{ ok: true }`
  - `DELETE /api/photos/:id` → 200 `{ ok: true }`

- [ ] **Step 1: Write the failing test**

Create `server/photos.routes.test.js`. The `login()` helper returns the cookie every authorised request needs:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PASSWORD = 'test-password-123'
// Smallest valid PNG — one transparent pixel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

let dir
let app
let store

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-photos-'))
  process.env.DATA_DIR = dir
  process.env.SESSION_SECRET = 'test-session-secret'
  vi.resetModules()

  const auth = await import('./auth.js')
  process.env.ADMIN_PASSWORD_HASH = await auth.hashPassword(PASSWORD)
  auth.resetRateLimit()

  store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  app = createApp()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
  delete process.env.ADMIN_PASSWORD_HASH
})

async function login() {
  const res = await request(app).post('/api/auth/login').send({ password: PASSWORD })
  return res.headers['set-cookie']
}

describe('authorisation', () => {
  it('refuses an unauthenticated DELETE and leaves the store untouched', async () => {
    const target = store.read().photos[0]
    const before = store.read().photos.length

    await request(app).delete(`/api/photos/${target.id}`).expect(401)

    expect(store.read().photos.length).toBe(before)
    expect(store.read().photos.some((p) => p.id === target.id)).toBe(true)
  })

  it('refuses unauthenticated upload, patch and reorder', async () => {
    const target = store.read().photos[0]
    await request(app).post('/api/photos').attach('file', PNG, 'x.png').expect(401)
    await request(app).patch(`/api/photos/${target.id}`).send({ alt: 'hacked' }).expect(401)
    await request(app).post('/api/photos/reorder').send({ collection: 'page', ids: [] }).expect(401)
  })
})

describe('POST /api/photos', () => {
  it('stores the file and appends a row pointing at /uploads', async () => {
    const cookie = await login()
    const before = store.read().photos.filter((p) => p.collection === 'page').length

    const res = await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'page')
      .field('alt', 'A new van')
      .attach('file', PNG, 'photo.png')
      .expect(201)

    expect(res.body.photo.src).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/)
    expect(res.body.photo.alt).toBe('A new van')
    expect(res.body.photo.collection).toBe('page')

    const after = store.read().photos.filter((p) => p.collection === 'page')
    expect(after.length).toBe(before + 1)
    // The row sorts last so new photos land at the end of the collection.
    expect(Math.max(...after.map((p) => p.sortOrder))).toBe(res.body.photo.sortOrder)

    const files = await readdir(join(dir, 'uploads'))
    expect(files.length).toBe(1)
  })

  it('rejects a non-image', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'page')
      .attach('file', Buffer.from('<html>hi</html>'), {
        filename: 'x.html',
        contentType: 'text/html',
      })
      .expect(400)
  })

  it('rejects an unknown collection', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'nonsense')
      .attach('file', PNG, 'photo.png')
      .expect(400)
  })

  it('ignores the client filename and never writes outside uploads/', async () => {
    const cookie = await login()
    const res = await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'page')
      .attach('file', PNG, '../../../etc/passwd.png')
      .expect(201)

    expect(res.body.photo.src).not.toContain('..')
    const files = await readdir(join(dir, 'uploads'))
    expect(files.every((f) => !f.includes('passwd'))).toBe(true)
  })
})

describe('PATCH /api/photos/:id', () => {
  it('updates alt and caption', async () => {
    const cookie = await login()
    const target = store.read().photos[0]

    await request(app)
      .patch(`/api/photos/${target.id}`)
      .set('Cookie', cookie)
      .send({ alt: 'Updated alt', caption: 'Updated caption' })
      .expect(200)

    const updated = store.read().photos.find((p) => p.id === target.id)
    expect(updated.alt).toBe('Updated alt')
    expect(updated.caption).toBe('Updated caption')
  })

  it('404s for an unknown id', async () => {
    const cookie = await login()
    await request(app)
      .patch('/api/photos/nope')
      .set('Cookie', cookie)
      .send({ alt: 'x' })
      .expect(404)
  })
})

describe('POST /api/photos/reorder', () => {
  it('rewrites sortOrder to match the given id order', async () => {
    const cookie = await login()
    const page = store.read().photos.filter((p) => p.collection === 'page')
    const reversed = [...page].reverse().map((p) => p.id)

    await request(app)
      .post('/api/photos/reorder')
      .set('Cookie', cookie)
      .send({ collection: 'page', ids: reversed })
      .expect(200)

    const after = store
      .read()
      .photos.filter((p) => p.collection === 'page')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.id)

    expect(after).toEqual(reversed)
  })
})

describe('DELETE /api/photos/:id', () => {
  it('removes an uploaded photo and its file', async () => {
    const cookie = await login()
    const created = await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'page')
      .attach('file', PNG, 'photo.png')

    await request(app)
      .delete(`/api/photos/${created.body.photo.id}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(store.read().photos.some((p) => p.id === created.body.photo.id)).toBe(false)
    expect(await readdir(join(dir, 'uploads'))).toEqual([])
  })

  it('removes a seeded row without touching the shipped image', async () => {
    const cookie = await login()
    const seeded = store.read().photos.find((p) => p.src.startsWith('/images/'))

    await request(app).delete(`/api/photos/${seeded.id}`).set('Cookie', cookie).expect(200)

    expect(store.read().photos.some((p) => p.id === seeded.id)).toBe(false)
    // Nothing was in uploads/ to delete, and the build asset is untouched.
    expect(await readdir(join(dir, 'uploads'))).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run server/photos.routes.test.js`
Expected: FAIL — 404 on `/api/photos`

- [ ] **Step 3: Write `server/routes/photos.js`**

```js
import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { read, mutate, uploadsDir } from '../store.js'
import { extForMime, MAX_UPLOAD_BYTES } from '../validate.js'
import { requireAuth } from './auth.js'

const COLLECTIONS = ['interiors', 'exteriors', 'page']

// Memory storage: the browser has already resized to ~300KB, and holding it in
// memory lets us validate the type before anything touches disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } })

const router = Router()
router.use(requireAuth)

router.post('/', upload.single('file'), async (req, res) => {
  const collection = req.body?.collection
  if (!COLLECTIONS.includes(collection)) {
    res.status(400).json({ error: 'unknown collection' })
    return
  }

  const ext = extForMime(req.file?.mimetype)
  if (!req.file || !ext) {
    res.status(400).json({ error: 'file must be a webp, jpeg or png image' })
    return
  }

  // The filename is ours, never the client's — basename() on a supplied name
  // is not enough to make path traversal safe, so we do not use it at all.
  const name = `${randomUUID()}.${ext}`
  await writeFile(join(uploadsDir(), name), req.file.buffer)

  const photo = {
    id: randomUUID(),
    collection,
    src: `/uploads/${name}`,
    alt: req.body?.alt ?? '',
    caption: req.body?.caption ?? '',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  }

  await mutate((content) => {
    const peers = content.photos.filter((p) => p.collection === collection)
    photo.sortOrder = peers.length ? Math.max(...peers.map((p) => p.sortOrder)) + 1 : 0
    content.photos.push(photo)
  })

  res.status(201).json({ photo })
})

router.patch('/:id', async (req, res) => {
  const exists = read().photos.some((p) => p.id === req.params.id)
  if (!exists) {
    res.status(404).json({ error: 'not found' })
    return
  }

  if (req.body?.collection !== undefined && !COLLECTIONS.includes(req.body.collection)) {
    res.status(400).json({ error: 'unknown collection' })
    return
  }

  const photo = await mutate((content) => {
    const target = content.photos.find((p) => p.id === req.params.id)
    for (const field of ['alt', 'caption', 'collection']) {
      if (req.body?.[field] !== undefined) target[field] = req.body[field]
    }
    return target
  })

  res.json({ photo })
})

router.post('/reorder', async (req, res) => {
  const { collection, ids } = req.body ?? {}
  if (!COLLECTIONS.includes(collection) || !Array.isArray(ids)) {
    res.status(400).json({ error: 'collection and ids are required' })
    return
  }

  await mutate((content) => {
    ids.forEach((id, index) => {
      const target = content.photos.find((p) => p.id === id && p.collection === collection)
      if (target) target.sortOrder = index
    })
  })

  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  const target = read().photos.find((p) => p.id === req.params.id)
  if (!target) {
    res.status(404).json({ error: 'not found' })
    return
  }

  await mutate((content) => {
    content.photos = content.photos.filter((p) => p.id !== req.params.id)
  })

  // Seeded rows point at /images/*, which ships with the build and must stay.
  // Only uploaded files are ours to remove.
  if (target.src.startsWith('/uploads/')) {
    await unlink(join(uploadsDir(), basename(target.src))).catch(() => {})
  }

  res.json({ ok: true })
})

export default router
```

- [ ] **Step 4: Mount it in `server/app.js`**

Add the import and mount it after the auth routes:

```js
import photoRoutes from './routes/photos.js'
```

```js
app.use('/api/photos', photoRoutes)
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `yarn vitest run server/photos.routes.test.js`
Expected: PASS, 11 tests

- [ ] **Step 6: Commit**

```bash
git add server/routes/photos.js server/photos.routes.test.js server/app.js
git commit -m "feat(server): photo upload, edit, reorder and delete routes"
```

---

### Task 7: Tour routes and the backup export

**Files:**

- Create: `server/routes/tours.js`, `server/tours.routes.test.js`
- Modify: `server/app.js` (mount tours + `/api/admin/export`)

**Interfaces:**

- Produces:
  - `POST /api/tours` `{ title, embedUrl, poster? }` → 201 `{ tour }`
  - `PATCH /api/tours/:id` `{ title?, embedUrl?, poster? }` → 200 `{ tour }`
  - `POST /api/tours/reorder` `{ ids }` → 200 `{ ok: true }`
  - `DELETE /api/tours/:id` → 200 `{ ok: true }`
  - `GET /api/admin/export` → `content.json` as an attachment

- [ ] **Step 1: Write the failing test**

Create `server/tours.routes.test.js`. Reuse the same `beforeEach`/`login()` scaffolding as Task 6 (repeated in full so this file stands alone):

```js
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PASSWORD = 'test-password-123'
const VALID = 'https://kuula.co/share/collection/7T3NS'

let dir
let app
let store

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-tours-'))
  process.env.DATA_DIR = dir
  process.env.SESSION_SECRET = 'test-session-secret'
  vi.resetModules()

  const auth = await import('./auth.js')
  process.env.ADMIN_PASSWORD_HASH = await auth.hashPassword(PASSWORD)
  auth.resetRateLimit()

  store = await import('./store.js')
  await store.load()
  const { createApp } = await import('./app.js')
  app = createApp()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
  delete process.env.ADMIN_PASSWORD_HASH
})

async function login() {
  const res = await request(app).post('/api/auth/login').send({ password: PASSWORD })
  return res.headers['set-cookie']
}

describe('authorisation', () => {
  it('refuses every unauthenticated mutation', async () => {
    const target = store.read().tours[0]
    await request(app).post('/api/tours').send({ title: 'x', embedUrl: VALID }).expect(401)
    await request(app).patch(`/api/tours/${target.id}`).send({ title: 'x' }).expect(401)
    await request(app).delete(`/api/tours/${target.id}`).expect(401)
  })
})

describe('POST /api/tours', () => {
  it('creates a tour at the end of the list', async () => {
    const cookie = await login()
    const before = store.read().tours.length

    const res = await request(app)
      .post('/api/tours')
      .set('Cookie', cookie)
      .send({ title: 'Explorer 21', embedUrl: VALID })
      .expect(201)

    expect(res.body.tour.title).toBe('Explorer 21')
    expect(store.read().tours.length).toBe(before + 1)
    expect(res.body.tour.sortOrder).toBe(before)
  })

  it('rejects an off-allowlist or non-https embed URL', async () => {
    const cookie = await login()
    for (const embedUrl of [
      'javascript:alert(1)',
      'http://kuula.co/share/x',
      'https://evil.example.com/x',
    ]) {
      await request(app)
        .post('/api/tours')
        .set('Cookie', cookie)
        .send({ title: 'bad', embedUrl })
        .expect(400)
    }
  })

  it('requires a title', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/tours')
      .set('Cookie', cookie)
      .send({ embedUrl: VALID })
      .expect(400)
  })
})

describe('PATCH /api/tours/:id', () => {
  it('updates the title', async () => {
    const cookie = await login()
    const target = store.read().tours[0]

    await request(app)
      .patch(`/api/tours/${target.id}`)
      .set('Cookie', cookie)
      .send({ title: 'Renamed' })
      .expect(200)

    expect(store.read().tours.find((t) => t.id === target.id).title).toBe('Renamed')
  })

  it('still validates the embed URL on update', async () => {
    const cookie = await login()
    const target = store.read().tours[0]
    await request(app)
      .patch(`/api/tours/${target.id}`)
      .set('Cookie', cookie)
      .send({ embedUrl: 'https://evil.example.com/x' })
      .expect(400)
  })
})

describe('DELETE /api/tours/:id', () => {
  it('removes the tour', async () => {
    const cookie = await login()
    const target = store.read().tours[0]
    await request(app).delete(`/api/tours/${target.id}`).set('Cookie', cookie).expect(200)
    expect(store.read().tours.some((t) => t.id === target.id)).toBe(false)
  })
})

describe('GET /api/admin/export', () => {
  it('requires auth and returns the whole store', async () => {
    await request(app).get('/api/admin/export').expect(401)

    const cookie = await login()
    const res = await request(app).get('/api/admin/export').set('Cookie', cookie).expect(200)
    expect(res.headers['content-disposition']).toContain('attachment')
    expect(res.body.photos.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run server/tours.routes.test.js`
Expected: FAIL — 404 on `/api/tours`

- [ ] **Step 3: Write `server/routes/tours.js`**

```js
import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { read, mutate } from '../store.js'
import { isValidEmbedUrl } from '../validate.js'
import { requireAuth } from './auth.js'

const router = Router()
router.use(requireAuth)

router.post('/', async (req, res) => {
  const { title, embedUrl, poster } = req.body ?? {}
  if (!title) {
    res.status(400).json({ error: 'title is required' })
    return
  }
  if (!isValidEmbedUrl(embedUrl)) {
    res.status(400).json({ error: 'embed URL must be an https kuula.co or matterport.com link' })
    return
  }

  const tour = {
    id: randomUUID(),
    title,
    embedUrl,
    poster: poster ?? null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  }

  await mutate((content) => {
    tour.sortOrder = content.tours.length
      ? Math.max(...content.tours.map((t) => t.sortOrder)) + 1
      : 0
    content.tours.push(tour)
  })

  res.status(201).json({ tour })
})

router.patch('/:id', async (req, res) => {
  if (!read().tours.some((t) => t.id === req.params.id)) {
    res.status(404).json({ error: 'not found' })
    return
  }
  if (req.body?.embedUrl !== undefined && !isValidEmbedUrl(req.body.embedUrl)) {
    res.status(400).json({ error: 'embed URL must be an https kuula.co or matterport.com link' })
    return
  }

  const tour = await mutate((content) => {
    const target = content.tours.find((t) => t.id === req.params.id)
    for (const field of ['title', 'embedUrl', 'poster']) {
      if (req.body?.[field] !== undefined) target[field] = req.body[field]
    }
    return target
  })

  res.json({ tour })
})

router.post('/reorder', async (req, res) => {
  const { ids } = req.body ?? {}
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'ids is required' })
    return
  }
  await mutate((content) => {
    ids.forEach((id, index) => {
      const target = content.tours.find((t) => t.id === id)
      if (target) target.sortOrder = index
    })
  })
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  if (!read().tours.some((t) => t.id === req.params.id)) {
    res.status(404).json({ error: 'not found' })
    return
  }
  await mutate((content) => {
    content.tours = content.tours.filter((t) => t.id !== req.params.id)
  })
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 4: Mount tours and the export route in `server/app.js`**

Add imports — note `./store.js` is **already imported** for `uploadsDir`, so
widen that existing line rather than adding a second import of the same module:

```js
import tourRoutes from './routes/tours.js'
import { requireAuth } from './routes/auth.js'
```

```js
import { uploadsDir, read } from './store.js' // was: { uploadsDir }
```

and mount, after the photo routes:

```js
app.use('/api/tours', tourRoutes)

// Railway volumes are not backed up. This is the client's escape hatch for
// the metadata; the image files themselves need manual recovery.
app.get('/api/admin/export', requireAuth, (req, res) => {
  res.set('Content-Disposition', 'attachment; filename="ausflex-content.json"')
  res.json(read())
})
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `yarn vitest run server/tours.routes.test.js`
Expected: PASS, 8 tests

- [ ] **Step 6: Run the whole server suite together**

Run: `yarn vitest run server/`
Expected: PASS — every server test file green

- [ ] **Step 7: Commit**

```bash
git add server/routes/tours.js server/tours.routes.test.js server/app.js
git commit -m "feat(server): tour CRUD with embed-URL validation, plus content export"
```

---

### Task 8: Client content store

**Files:**

- Create: `src/lib/contentStore.js`, `src/test/contentStore.test.js`

**Interfaces:**

- Consumes: `gallery` from `src/content/gallery.js`, `tour` from `src/content/tour.js` (fallback only)
- Produces:
  - `useContent(): { status: 'loading' | 'ready' | 'error', data: Content | null }`
  - `useCollection(name): { loading: boolean, items: Photo[] }`
  - `useTours(): { loading: boolean, tours: Tour[] }`
  - `fallback: Content` — exported for tests

- [ ] **Step 1: Write the failing test**

Create `src/test/contentStore.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const LIVE = {
  gallery: {
    interiors: [{ id: '1', src: '/uploads/a.webp', alt: 'Live interior', caption: '' }],
    exteriors: [{ id: '2', src: '/uploads/b.webp', alt: 'Live exterior', caption: '' }],
    page: [{ id: '3', src: '/uploads/c.webp', alt: 'Live page photo', caption: '' }],
  },
  tours: [{ id: '4', title: 'Live tour', embedUrl: 'https://kuula.co/share/x', poster: null }],
}

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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run src/test/contentStore.test.js`
Expected: FAIL — `Cannot find module '../lib/contentStore.js'`

- [ ] **Step 3: Write `src/lib/contentStore.js`**

```js
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `yarn vitest run src/test/contentStore.test.js`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/contentStore.js src/test/contentStore.test.js
git commit -m "feat(client): live content store with static fallback"
```

---

### Task 9: Public photo surfaces read from the store

Also fixes the orphaned `exteriors` collection by giving it a home on `/gallery`.

**Files:**

- Modify: `src/components/GalleryGrid.jsx`, `src/components/GalleryGrid.css`, `src/components/InteriorsRail.jsx`, `src/components/InteriorsRail.css`, `src/pages/Home.jsx`, `src/pages/GalleryPage.jsx`
- Test: `src/test/components.test.jsx` (extend)

**Interfaces:**

- Consumes: `useCollection` from `src/lib/contentStore.js`
- Produces: `GalleryGrid` and `InteriorsRail` both accept a new optional `loading` prop; when true they render fixed-aspect skeleton tiles instead of images. Their existing `content={{ eyebrow, heading, sub, items }}` shape is unchanged.

- [ ] **Step 1: Write the failing test**

Append to `src/test/components.test.jsx`:

```js
describe('gallery skeletons', () => {
  it('GalleryGrid renders placeholder tiles while loading and no images', () => {
    const { container } = render(
      <GalleryGrid content={{ heading: 'Gallery', items: [] }} loading />,
    )
    expect(container.querySelectorAll('.gallery-grid__tile--skeleton').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('img').length).toBe(0)
  })

  it('GalleryGrid renders real tiles once loading is false', () => {
    const items = [{ id: '1', src: '/uploads/a.webp', alt: 'A van' }]
    const { container } = render(<GalleryGrid content={{ heading: 'Gallery', items }} />)
    expect(container.querySelectorAll('.gallery-grid__tile--skeleton').length).toBe(0)
    expect(container.querySelector('img').getAttribute('src')).toBe('/uploads/a.webp')
  })

  it('renders alt="" for a photo with no alt text rather than inventing one', () => {
    const items = [{ id: '1', src: '/uploads/a.webp', alt: '' }]
    const { container } = render(<GalleryGrid content={{ heading: 'Gallery', items }} />)
    expect(container.querySelector('img').getAttribute('alt')).toBe('')
  })

  it('InteriorsRail renders skeleton cards while loading', () => {
    const { container } = render(
      <InteriorsRail content={{ heading: 'Interiors', items: [] }} loading />,
    )
    expect(container.querySelectorAll('.interiors-rail__card--skeleton').length).toBeGreaterThan(0)
  })
})
```

Add the imports at the top of the file if they are not already present:

```js
import GalleryGrid from '../components/GalleryGrid.jsx'
import InteriorsRail from '../components/InteriorsRail.jsx'
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run src/test/components.test.jsx`
Expected: FAIL — no `.gallery-grid__tile--skeleton` elements

- [ ] **Step 3: Add the skeleton branch to `GalleryGrid.jsx`**

Change the signature and key the map on `photo.id ?? photo.src` (uploaded photos can repeat a filename-free src only by id):

```js
export default function GalleryGrid({ content, dark = false, lightbox = false, loading = false, id }) {
```

Immediately before the existing `<div className="gallery-grid__mosaic">` map, add the skeleton branch inside the mosaic div:

```jsx
        <div className="gallery-grid__mosaic">
          {loading &&
            Array.from({ length: SKELETON_TILES }, (_, i) => (
              <div key={`skeleton-${i}`} className="gallery-grid__tile gallery-grid__tile--skeleton" />
            ))}
          {!loading &&
            content.items.map((photo, i) => {
```

and declare the constant above the component:

```js
// One full mosaic block — see GalleryGrid.css, which tiles in nines.
const SKELETON_TILES = 9
```

Change the `key` on the `motion.figure` from `photo.src` to:

```jsx
              <motion.figure key={photo.id ?? photo.src} className="gallery-grid__tile" {...scrollIn(i % 6)}>
```

- [ ] **Step 4: Add the skeleton style to `GalleryGrid.css`**

Append, using existing tokens only:

```css
/* Placeholder tiles hold the mosaic's shape while live content loads, so the
   grid never reflows when photos arrive. */
.gallery-grid__tile--skeleton {
  background: var(--color-bg-alt);
}
```

- [ ] **Step 5: Do the same for `InteriorsRail.jsx` and `InteriorsRail.css`**

```js
const SKELETON_CARDS = 6
```

```jsx
        {loading &&
          Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <div key={`skeleton-${i}`} className="interiors-rail__card interiors-rail__card--skeleton" />
          ))}
        {!loading &&
          content.items.map((photo, i) => (
```

with the signature gaining `loading = false` and the `key` becoming `photo.id ?? photo.src`, and in the CSS:

```css
.interiors-rail__card--skeleton {
  background: var(--color-bg-alt);
}
```

- [ ] **Step 6: Wire `Home.jsx` to the store**

Replace the `gallery` import with the hook and pass live items plus `loading`:

```jsx
import { useCollection } from '../lib/contentStore.js'
import { gallery } from '../content/gallery.js'
```

```jsx
export default function Home() {
  const interiors = useCollection('interiors')

  return (
    <main>
      {/* …unchanged sections… */}
      <InteriorsRail
        content={{ ...gallery.interiors, items: interiors.items }}
        loading={interiors.loading}
        id="interiors"
      />
      {/* …unchanged sections… */}
    </main>
  )
}
```

The headings still come from `gallery.interiors` — section copy stays in the content file by design; only the photo list is live.

- [ ] **Step 7: Wire `GalleryPage.jsx` and give `exteriors` a home**

```jsx
import { useCollection } from '../lib/contentStore.js'
import { gallery } from '../content/gallery.js'
```

```jsx
export default function GalleryPage() {
  const page = useCollection('page')
  const exteriors = useCollection('exteriors')

  return (
    <main>
      {/* …SEO and page-hero unchanged… */}
      <GalleryGrid
        content={{ ...gallery.exteriors, items: exteriors.items }}
        loading={exteriors.loading}
        dark
        id="exteriors"
      />
      <GalleryGrid
        content={{ ...gallery.page, eyebrow: null, heading: null, sub: null, items: page.items }}
        loading={page.loading}
        lightbox
      />
      <DealerBanner />
    </main>
  )
}
```

- [ ] **Step 8: Run the component and a11y suites**

Run: `yarn vitest run src/test/components.test.jsx src/test/a11y.test.jsx`
Expected: PASS

- [ ] **Step 9: See it in the browser**

Run `yarn dev:api` in one terminal and `yarn dev` in another, then open `http://localhost:5173/gallery`.
Expected: skeleton tiles for a beat, then the full mosaic, plus a new dark exteriors band above it. No layout jump when the photos arrive.

- [ ] **Step 10: Commit**

```bash
git add src/components/GalleryGrid.jsx src/components/GalleryGrid.css src/components/InteriorsRail.jsx src/components/InteriorsRail.css src/pages/Home.jsx src/pages/GalleryPage.jsx src/test/components.test.jsx
git commit -m "feat(client): gallery surfaces read live content, exteriors band on /gallery"
```

---

### Task 10: Multiple 360 tours

**Files:**

- Modify: `src/components/VirtualTour.jsx`, `src/components/VirtualTour.css`, `src/pages/TourPage.jsx`
- Test: `src/test/components.test.jsx` (extend)

**Interfaces:**

- Consumes: `useTours` from `src/lib/contentStore.js`
- Produces: `VirtualTour` accepts `tours: Tour[]`. With `full`, it renders a picker — one button per tour, **exactly one iframe mounted at a time**. Without `full`, it renders the first tour only, keeping the existing launch-poster behaviour.

- [ ] **Step 1: Write the failing test**

Append to `src/test/components.test.jsx`:

```js
describe('VirtualTour with multiple tours', () => {
  const tours = [
    {
      id: 'a',
      title: 'Explorer 21',
      embedUrl: 'https://kuula.co/share/a',
      poster: '/images/x.jpg',
    },
    { id: 'b', title: 'Sea Breeze', embedUrl: 'https://kuula.co/share/b', poster: '/images/y.jpg' },
  ]

  it('renders a picker with one button per tour and one iframe', () => {
    render(<VirtualTour content={tour} tours={tours} full />)

    expect(screen.getByRole('button', { name: /Explorer 21/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sea Breeze/ })).toBeInTheDocument()
    // Mounting several Kuula players at once would be punishing.
    expect(document.querySelectorAll('iframe').length).toBe(1)
  })

  it('swaps the iframe src when another tour is picked, keeping one iframe', async () => {
    const user = userEvent.setup()
    render(<VirtualTour content={tour} tours={tours} full />)

    expect(document.querySelector('iframe').getAttribute('src')).toBe(tours[0].embedUrl)

    await user.click(screen.getByRole('button', { name: /Sea Breeze/ }))

    expect(document.querySelectorAll('iframe').length).toBe(1)
    expect(document.querySelector('iframe').getAttribute('src')).toBe(tours[1].embedUrl)
  })

  it('marks the active tour for assistive tech', async () => {
    const user = userEvent.setup()
    render(<VirtualTour content={tour} tours={tours} full />)

    expect(screen.getByRole('button', { name: /Explorer 21/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await user.click(screen.getByRole('button', { name: /Sea Breeze/ }))
    expect(screen.getByRole('button', { name: /Sea Breeze/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('renders no picker and stays behind the poster on the home band', () => {
    render(<VirtualTour content={tour} tours={tours} />)
    expect(screen.queryByRole('button', { name: /Sea Breeze/ })).not.toBeInTheDocument()
    expect(document.querySelectorAll('iframe').length).toBe(0)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run src/test/components.test.jsx -t "multiple tours"`
Expected: FAIL — no picker buttons

- [ ] **Step 3: Update `VirtualTour.jsx`**

```jsx
export default function VirtualTour({ content = tour, tours = [], full = false }) {
  const scrollIn = useScrollIn()
  const [active, setActive] = useState(full)
  const [index, setIndex] = useState(0)

  // The first tour by sort order is what the home band shows; the picker only
  // appears on the full /360 page.
  const list = tours.length ? tours : [{ id: 'static', title: content.title, embedUrl: content.src, poster: content.poster }]
  const current = list[Math.min(index, list.length - 1)]
  const showPicker = full && list.length > 1
```

Replace the iframe's `src`/`title` with the current tour, and render the picker above the frame when `showPicker`:

```jsx
{
  showPicker && (
    <div className="tour__picker" role="group" aria-label="Choose a tour">
      {list.map((item, i) => (
        <button
          key={item.id}
          type="button"
          className={`tour__pick${i === index ? ' tour__pick--active' : ''}`}
          aria-current={i === index ? 'true' : undefined}
          onClick={() => setIndex(i)}
        >
          {item.title}
        </button>
      ))}
    </div>
  )
}
```

```jsx
<iframe
  key={current.id}
  className="tour__player"
  src={current.embedUrl}
  title={current.title}
  allow="xr-spatial-tracking; gyroscope; accelerometer"
  allowFullScreen
/>
```

and the poster branch uses `current.poster`:

```jsx
<img src={current.poster} alt="" loading="lazy" />
```

- [ ] **Step 4: Style the picker in `VirtualTour.css`**

```css
/* Tour picker: one button per tour, only the active one has a mounted player. */
.tour__picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
  margin-bottom: var(--space-md);
}

.tour__pick {
  padding: var(--space-2xs) var(--space-xs);
  border: 1px solid var(--color-rule);
  background: transparent;
  color: var(--color-text-soft);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.tour__pick:hover {
  border-color: var(--color-border-strong);
}

.tour__pick--active {
  border-color: var(--color-accent-dark);
  color: var(--color-accent-dark);
}
```

The eyebrow treatment (mono, uppercase, tracked) matches `.section-eyebrow` in
`index.css`, so the picker reads as part of the existing system rather than a
new control style.

- [ ] **Step 5: Wire `TourPage.jsx` and the home band**

In `src/pages/TourPage.jsx`:

```jsx
import { useTours } from '../lib/contentStore.js'
```

```jsx
export default function TourPage() {
  const { tours } = useTours()
  return (
    <main>
      {/* …SEO and page-hero unchanged… */}
      <VirtualTour
        content={{ ...tour, eyebrow: null, heading: null, sub: null }}
        tours={tours}
        full
      />
      <DealerBanner />
    </main>
  )
}
```

In `src/pages/Home.jsx`, pass the same list so the band shows the first live tour:

```jsx
const { tours } = useTours()
```

```jsx
<VirtualTour tours={tours} />
```

- [ ] **Step 6: Run the tests**

Run: `yarn vitest run src/test/components.test.jsx src/test/a11y.test.jsx`
Expected: PASS

- [ ] **Step 7: Check it by hand**

With both dev servers running, open `http://localhost:5173/360`.
Expected: the tour loads immediately; with more than one tour, buttons appear and switching swaps the single player.

- [ ] **Step 8: Commit**

```bash
git add src/components/VirtualTour.jsx src/components/VirtualTour.css src/pages/TourPage.jsx src/pages/Home.jsx src/test/components.test.jsx
git commit -m "feat(client): multi-tour picker on /360, single mounted player"
```

---

### Task 11: Admin shell, login, and the layout split

**Files:**

- Create: `src/admin/api.js`, `src/admin/Login.jsx`, `src/admin/admin.css`, `src/pages/AdminPage.jsx`, `src/test/admin.test.jsx`
- Modify: `src/App.jsx`, `public/robots.txt`, `public/sitemap.xml`

**Interfaces:**

- Produces:
  - `src/admin/api.js` — `getSession()`, `login(password)`, `logout()`, `getContent()`, `uploadPhoto({file, collection, alt, caption})`, `patchPhoto(id, patch)`, `reorderPhotos(collection, ids)`, `deletePhoto(id)`, `createTour(body)`, `patchTour(id, patch)`, `reorderTours(ids)`, `deleteTour(id)`, `exportUrl`. Every function rejects with an `Error` carrying `.status`.
  - `AdminPage` — default export, rendered outside the site chrome.
- Consumed by: Tasks 12 and 13.

- [ ] **Step 1: Write the failing test**

Create `src/test/admin.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { HelmetProvider } from 'react-helmet-async'
import AdminPage from '../pages/AdminPage.jsx'

function renderAdmin() {
  return render(
    <HelmetProvider>
      <AdminPage />
    </HelmetProvider>,
  )
}

const EMPTY_CONTENT = {
  gallery: { interiors: [], exteriors: [], page: [] },
  tours: [],
}

function mockFetch(handlers) {
  return vi.fn(async (url, options = {}) => {
    const key = `${options.method ?? 'GET'} ${url}`
    const handler = handlers[key]
    if (!handler) return { ok: false, status: 404, json: async () => ({ error: 'not mocked' }) }
    return handler
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('AdminPage', () => {
  it('shows the login form when not authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: false }) },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument())
    expect(screen.queryByRole('tab', { name: /photos/i })).not.toBeInTheDocument()
  })

  it('shows the dashboard when already authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => EMPTY_CONTENT },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByRole('tab', { name: /photos/i })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: /360/i })).toBeInTheDocument()
  })

  it('surfaces a wrong-password error instead of failing silently', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: false }) },
        'POST /api/auth/login': {
          ok: false,
          status: 401,
          json: async () => ({ error: 'incorrect password' }),
        },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument())
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/incorrect password/i))
  })

  it('surfaces the rate-limit message', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: false }) },
        'POST /api/auth/login': {
          ok: false,
          status: 429,
          json: async () => ({ error: 'too many attempts, try again in 15 minutes' }),
        },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument())
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/too many attempts/i))
  })

  it('the login screen has no accessibility violations', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ 'GET /api/auth/session': { ok: true, json: async () => ({ authed: false }) } }),
    )
    const { container } = renderAdmin()
    await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the dashboard has no accessibility violations', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => EMPTY_CONTENT },
      }),
    )
    const { container } = renderAdmin()
    await waitFor(() => expect(screen.getByRole('tab', { name: /photos/i })).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: FAIL — `Cannot find module '../pages/AdminPage.jsx'`

- [ ] **Step 3: Write `src/admin/api.js`**

```js
// Thin wrappers over /api. Every one rejects with an Error carrying .status so
// callers can distinguish 401 (session expired) from 429 (rate limited).
async function request(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.error || `Request failed (${res.status})`), {
      status: res.status,
    })
  }
  return res.json()
}

const asJson = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const exportUrl = '/api/admin/export'

export const getSession = () => request('/api/auth/session')
export const login = (password) => request('/api/auth/login', asJson({ password }))
export const logout = () => request('/api/auth/logout', { method: 'POST' })
export const getContent = () => request('/api/content')

export function uploadPhoto({ file, collection, alt, caption }) {
  const form = new FormData()
  form.append('file', file)
  form.append('collection', collection)
  form.append('alt', alt ?? '')
  form.append('caption', caption ?? '')
  return request('/api/photos', { method: 'POST', body: form })
}

export const patchPhoto = (id, patch) =>
  request(`/api/photos/${id}`, { ...asJson(patch), method: 'PATCH' })
export const reorderPhotos = (collection, ids) =>
  request('/api/photos/reorder', asJson({ collection, ids }))
export const deletePhoto = (id) => request(`/api/photos/${id}`, { method: 'DELETE' })

export const createTour = (body) => request('/api/tours', asJson(body))
export const patchTour = (id, patch) =>
  request(`/api/tours/${id}`, { ...asJson(patch), method: 'PATCH' })
export const reorderTours = (ids) => request('/api/tours/reorder', asJson({ ids }))
export const deleteTour = (id) => request(`/api/tours/${id}`, { method: 'DELETE' })
```

- [ ] **Step 4: Write `src/admin/Login.jsx`**

```jsx
import { useState } from 'react'
import { login } from './api.js'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(password)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-login" onSubmit={onSubmit}>
      <h1 className="admin-login__title">Ausflex admin</h1>

      <label className="admin-field" htmlFor="admin-password">
        Password
      </label>
      <input
        id="admin-password"
        className="admin-input"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <button className="admin-button" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Write `src/pages/AdminPage.jsx`**

Tabs 12 and 13 fill in the two tab panels; for now render placeholders so the shell can be tested on its own.

```jsx
import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import Login from '../admin/Login.jsx'
import { getSession, getContent, logout } from '../admin/api.js'
import '../admin/admin.css'

const TABS = [
  { id: 'photos', label: 'Photos' },
  { id: 'tours', label: '360 Tours' },
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(null)
  const [tab, setTab] = useState('photos')
  const [content, setContent] = useState(null)

  const refresh = useCallback(async () => {
    setContent(await getContent())
  }, [])

  useEffect(() => {
    getSession()
      .then((s) => setAuthed(s.authed))
      .catch(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (authed) refresh()
  }, [authed, refresh])

  return (
    <>
      <Helmet>
        <title>Admin · Ausflex Caravans</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="admin">
        {authed === null && <p className="admin-status">Loading…</p>}

        {authed === false && <Login onSuccess={() => setAuthed(true)} />}

        {authed === true && (
          <>
            <header className="admin-header">
              <h1 className="admin-header__title">Ausflex admin</h1>
              <button
                className="admin-button admin-button--quiet"
                type="button"
                onClick={async () => {
                  await logout()
                  setAuthed(false)
                }}
              >
                Sign out
              </button>
            </header>

            <div className="admin-tabs" role="tablist" aria-label="Admin sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  className={`admin-tab${tab === t.id ? ' admin-tab--active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {TABS.map((t) => (
              <div
                key={t.id}
                role="tabpanel"
                id={`panel-${t.id}`}
                aria-labelledby={`tab-${t.id}`}
                hidden={tab !== t.id}
              >
                {tab === t.id && content && (
                  <p className="admin-status">Coming in the next task.</p>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 6: Write `src/admin/admin.css`**

A tool, not a marketing page: dense, quiet, no motion. Every colour, space and
font value is an existing token from `theme.config.js` — font sizes are literal
rem, matching how the rest of the component CSS in this repo handles type, since
there is no type-scale token.

```css
/* Admin dashboard. Deliberately plain — this is an internal tool, and its job
   is to be legible and hard to misuse, not to look like the site. */

.admin {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-md) var(--space-3xl);
  font-family: var(--font-body);
  color: var(--color-text);
}

.admin-status {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-muted);
  margin: var(--space-sm) 0;
}

/* Login */

.admin-login {
  max-width: 360px;
  margin: var(--space-3xl) auto;
  display: flex;
  flex-direction: column;
}

.admin-login__title,
.admin-header__title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 var(--space-md);
}

/* Header + tabs */

.admin-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-rule);
}

.admin-tabs {
  display: flex;
  gap: var(--space-2xs);
  margin: var(--space-md) 0 var(--space-lg);
}

.admin-tab {
  padding: var(--space-2xs) var(--space-sm);
  border: 1px solid var(--color-rule);
  background: transparent;
  color: var(--color-text-soft);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.admin-tab--active {
  border-color: var(--color-accent-dark);
  color: var(--color-accent-dark);
}

/* Fields */

.admin-field {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin: var(--space-xs) 0 var(--space-2xs);
}

.admin-input {
  width: 100%;
  padding: var(--space-2xs) var(--space-xs);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.9375rem;
}

.admin-input:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Buttons */

.admin-button {
  padding: var(--space-2xs) var(--space-sm);
  border: 1px solid var(--color-accent-dark);
  background: var(--color-accent-dark);
  color: var(--color-bg);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.admin-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.admin-button--quiet {
  background: transparent;
  border-color: var(--color-rule);
  color: var(--color-text-soft);
}

/* Errors — reuses the form error tokens the contact form already uses. */

.admin-error {
  margin: var(--space-sm) 0 0;
  padding: var(--space-2xs) var(--space-xs);
  border: 1px solid var(--color-danger-border);
  background: var(--color-danger-surface);
  color: var(--color-danger);
  font-size: 0.875rem;
}

.admin-hint {
  margin: var(--space-2xs) 0 var(--space-sm);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-muted);
}

/* Rows */

.admin-list {
  list-style: none;
  margin: var(--space-md) 0 0;
  padding: 0;
}

.admin-row {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: var(--space-sm);
  align-items: start;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-hairline);
}

.admin-thumb {
  width: 96px;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  background: var(--color-bg-alt);
}

.admin-row__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
  justify-content: flex-end;
}

.admin-confirm {
  display: flex;
  gap: var(--space-2xs);
}

.admin-toolbar {
  max-width: 320px;
}

.admin-panel {
  margin-top: var(--space-md);
}

.admin-row__fields {
  min-width: 0;
}

.admin-add {
  margin-top: var(--space-xl);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-rule);
}

.admin-add__title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  margin: 0;
}

@media (max-width: 640px) {
  /* The thumbnail column collapses before the fields become unusable. */
  .admin-row {
    grid-template-columns: 64px 1fr;
  }

  .admin-row__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
```

`ToursTab` rows have no thumbnail, so on those rows the first grid column sits
empty — that is intentional, it keeps the fields aligned between the two tabs.

- [ ] **Step 7: Split the layout in `src/App.jsx`**

Add the lazy import beside the others:

```js
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage.jsx'))
```

Extract the site chrome into a layout component. Add `Outlet` to the react-router import, then above `App`:

```jsx
// The marketing chrome. /admin renders outside it — it is a tool, not a page
// of the site.
function SiteLayout() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      {/* Skip-link target. Each routed page renders its own <main> landmark;
          this wrapper just gives the skip link a stable, focusable anchor. */}
      <div id="main" tabIndex={-1}>
        <Outlet />
      </div>
      <Footer />
    </>
  )
}
```

and restructure the `Routes` block so every existing route becomes a child of `SiteLayout`, with `/admin` a sibling:

```jsx
<ErrorBoundary>
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/vans" element={<VansPage />} />
        <Route path="/vans/:slug" element={<VanPage />} />
        <Route path="/why-ausflex" element={<WhyPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/360" element={<TourPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  </Suspense>
</ErrorBoundary>
```

- [ ] **Step 8: Keep `/admin` out of search**

In `public/robots.txt`, add before the sitemap line:

```
Disallow: /admin
```

Confirm `public/sitemap.xml` contains no `/admin` entry:

Run: `grep -c admin public/sitemap.xml`
Expected: `0`

- [ ] **Step 9: Run the tests**

Run: `yarn vitest run src/test/admin.test.jsx src/test/a11y.test.jsx src/test/components.test.jsx`
Expected: PASS — including both axe assertions

- [ ] **Step 10: Commit**

```bash
git add src/admin/ src/pages/AdminPage.jsx src/App.jsx src/test/admin.test.jsx public/robots.txt
git commit -m "feat(admin): shell, shared-password login and chrome-free layout"
```

---

### Task 12: Photos tab

**Files:**

- Create: `src/admin/resizeImage.js`, `src/admin/PhotosTab.jsx`, `src/test/resizeImage.test.js`
- Modify: `src/pages/AdminPage.jsx`, `src/admin/admin.css`, `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `uploadPhoto`, `patchPhoto`, `reorderPhotos`, `deletePhoto` from `src/admin/api.js`
- Produces:
  - `fitWithin(width, height, maxEdge): { width, height }` — pure, unit-tested
  - `resizeImage(file): Promise<File>` — canvas path, verified by hand
  - `PhotosTab({ photos, onChange })`

- [ ] **Step 1: Write the failing test for the pure sizing helper**

The canvas encode path cannot be tested meaningfully in jsdom — `createImageBitmap` and a real `toBlob` are not implemented there. The arithmetic is extracted so it _can_ be tested; the encode itself is verified by hand in Step 8.

Create `src/test/resizeImage.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { fitWithin } from '../admin/resizeImage.js'

describe('fitWithin', () => {
  it('leaves an already-small image alone', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 })
  })

  it('scales a landscape photo by its long edge', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
  })

  it('scales a portrait photo by its long edge', () => {
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 })
  })

  it('never returns a zero dimension for an extreme panorama', () => {
    const { width, height } = fitWithin(20000, 100, 2000)
    expect(width).toBe(2000)
    expect(height).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run src/test/resizeImage.test.js`
Expected: FAIL — `Cannot find module '../admin/resizeImage.js'`

- [ ] **Step 3: Write `src/admin/resizeImage.js`**

```js
// Shrink and re-encode in the browser before upload. A 9MB phone photo becomes
// roughly 300KB, so the shop's connection is not waiting on the full file and
// the site's performance budget survives staff uploads.
const MAX_EDGE = 2000
const QUALITY = 0.82

export function fitWithin(width, height, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export async function resizeImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }

  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
  // Safari below 14 and some older Android browsers cannot encode WebP.
  if (!blob) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  }
  if (!blob) throw new Error('Could not process that image.')

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], `photo.${ext}`, { type: blob.type })
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `yarn vitest run src/test/resizeImage.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Write `src/admin/PhotosTab.jsx`**

```jsx
import { useRef, useState } from 'react'
import { uploadPhoto, patchPhoto, reorderPhotos, deletePhoto } from './api.js'
import { resizeImage } from './resizeImage.js'

const COLLECTIONS = [
  { id: 'interiors', label: 'Interiors rail (home)' },
  { id: 'exteriors', label: 'Exteriors (gallery)' },
  { id: 'page', label: 'Gallery page' },
]

// GalleryGrid.css tiles the mosaic in blocks of nine, so a count that is not a
// multiple of nine ends on a short row. Surface it rather than let the client
// discover it on the live site.
function blockHint(count) {
  const remainder = count % 9
  if (count === 0) return 'No photos yet.'
  if (remainder === 0) return `${count} photos · ${count / 9} full blocks ✓`
  return `${count} photos · last row will be short (add ${9 - remainder} or remove ${remainder})`
}

export default function PhotosTab({ photos, onChange }) {
  const [collection, setCollection] = useState('page')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const fileInput = useRef(null)

  const items = photos
    .filter((p) => p.collection === collection)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onFiles(fileList) {
    const files = Array.from(fileList)
    await run(async () => {
      for (const original of files) {
        const file = await resizeImage(original)
        await uploadPhoto({ file, collection, alt: '', caption: '' })
      }
    })
    if (fileInput.current) fileInput.current.value = ''
  }

  function move(index, delta) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    run(() =>
      reorderPhotos(
        collection,
        next.map((p) => p.id),
      ),
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <label className="admin-field" htmlFor="collection">
          Collection
        </label>
        <select
          id="collection"
          className="admin-input"
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
        >
          {COLLECTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {collection === 'page' && <p className="admin-hint">{blockHint(items.length)}</p>}

      <label className="admin-field" htmlFor="photo-upload">
        Add photos
      </label>
      <input
        id="photo-upload"
        ref={fileInput}
        className="admin-input"
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        onChange={(e) => onFiles(e.target.files)}
      />

      {busy && <p className="admin-status">Working…</p>}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <ul className="admin-list">
        {items.map((photo, i) => (
          <li key={photo.id} className="admin-row">
            <img className="admin-thumb" src={photo.src} alt="" />

            <div className="admin-row__fields">
              <label className="admin-field" htmlFor={`alt-${photo.id}`}>
                Alt text (optional)
              </label>
              <input
                id={`alt-${photo.id}`}
                className="admin-input"
                defaultValue={photo.alt}
                onBlur={(e) => {
                  if (e.target.value !== photo.alt)
                    run(() => patchPhoto(photo.id, { alt: e.target.value }))
                }}
              />

              <label className="admin-field" htmlFor={`caption-${photo.id}`}>
                Caption (optional)
              </label>
              <input
                id={`caption-${photo.id}`}
                className="admin-input"
                defaultValue={photo.caption}
                onBlur={(e) => {
                  if (e.target.value !== photo.caption)
                    run(() => patchPhoto(photo.id, { caption: e.target.value }))
                }}
              />
            </div>

            <div className="admin-row__actions">
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => move(i, -1)}
                disabled={busy || i === 0}
                aria-label={`Move photo ${i + 1} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => move(i, 1)}
                disabled={busy || i === items.length - 1}
                aria-label={`Move photo ${i + 1} later`}
              >
                ↓
              </button>

              {confirming === photo.id ? (
                <span className="admin-confirm">
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => {
                      setConfirming(null)
                      run(() => deletePhoto(photo.id))
                    }}
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--quiet"
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => setConfirming(photo.id)}
                  aria-label={`Delete photo ${i + 1}`}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 6: Mount it in `AdminPage.jsx`**

Import it and replace the photos placeholder:

```jsx
import PhotosTab from '../admin/PhotosTab.jsx'
```

```jsx
{
  tab === 'photos' && content && (
    <PhotosTab
      photos={[...content.gallery.interiors, ...content.gallery.exteriors, ...content.gallery.page]}
      onChange={refresh}
    />
  )
}
```

Note `/api/content` returns photos already grouped by collection, and each row still carries its own `collection` field, so flattening is lossless.

- [ ] **Step 7: Extend `src/test/admin.test.jsx`**

```jsx
it('lists photos for the selected collection with editable alt text', async () => {
  vi.stubGlobal(
    'fetch',
    mockFetch({
      'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
      'GET /api/content': {
        ok: true,
        json: async () => ({
          gallery: {
            interiors: [],
            exteriors: [],
            page: [
              {
                id: 'p1',
                collection: 'page',
                src: '/uploads/a.webp',
                alt: 'A van',
                caption: '',
                sortOrder: 0,
              },
            ],
          },
          tours: [],
        }),
      },
    }),
  )
  renderAdmin()

  await waitFor(() => expect(screen.getByDisplayValue('A van')).toBeInTheDocument())
  expect(screen.getByText(/last row will be short/i)).toBeInTheDocument()
})

it('requires a second click to delete', async () => {
  const user = userEvent.setup()
  const spy = mockFetch({
    'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
    'GET /api/content': {
      ok: true,
      json: async () => ({
        gallery: {
          interiors: [],
          exteriors: [],
          page: [
            {
              id: 'p1',
              collection: 'page',
              src: '/uploads/a.webp',
              alt: 'A van',
              caption: '',
              sortOrder: 0,
            },
          ],
        },
        tours: [],
      }),
    },
  })
  vi.stubGlobal('fetch', spy)
  renderAdmin()

  await waitFor(() => expect(screen.getByDisplayValue('A van')).toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: /delete photo 1/i }))

  // Nothing is destroyed on the first click.
  expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
  expect(spy).not.toHaveBeenCalledWith(
    '/api/photos/p1',
    expect.objectContaining({ method: 'DELETE' }),
  )
})
```

- [ ] **Step 8: Verify the resize path by hand**

With both dev servers running, open `http://localhost:5173/admin`, sign in, and upload a large photo from disk.
Expected: it appears in the list within a second or two, and `ls -la .data/uploads` shows a file of roughly 200–500KB regardless of the original's size.

- [ ] **Step 9: Run the suites and commit**

Run: `yarn vitest run src/test/`
Expected: PASS

```bash
git add src/admin/PhotosTab.jsx src/admin/resizeImage.js src/admin/admin.css src/pages/AdminPage.jsx src/test/resizeImage.test.js src/test/admin.test.jsx
git commit -m "feat(admin): photos tab with browser-side resize, reorder and guarded delete"
```

---

### Task 13: Tours tab

**Files:**

- Create: `src/admin/ToursTab.jsx`
- Modify: `src/pages/AdminPage.jsx`, `src/admin/admin.css`, `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `createTour`, `patchTour`, `reorderTours`, `deleteTour`, `exportUrl` from `src/admin/api.js`
- Produces: `ToursTab({ tours, onChange })`

- [ ] **Step 1: Write the failing test**

Append to `src/test/admin.test.jsx`:

```jsx
const TOURS_CONTENT = {
  gallery: { interiors: [], exteriors: [], page: [] },
  tours: [
    {
      id: 't1',
      title: 'Explorer 21',
      embedUrl: 'https://kuula.co/share/a',
      poster: null,
      sortOrder: 0,
    },
    {
      id: 't2',
      title: 'Sea Breeze',
      embedUrl: 'https://kuula.co/share/b',
      poster: null,
      sortOrder: 1,
    },
  ],
}

it('lists tours and marks the first as the one on the home page', async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    'fetch',
    mockFetch({
      'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
      'GET /api/content': { ok: true, json: async () => TOURS_CONTENT },
    }),
  )
  renderAdmin()

  await waitFor(() => expect(screen.getByRole('tab', { name: /360/i })).toBeInTheDocument())
  await user.click(screen.getByRole('tab', { name: /360/i }))

  expect(screen.getByDisplayValue('Explorer 21')).toBeInTheDocument()
  // The home-page rule is visible rather than hidden.
  expect(screen.getByText(/shown on the home page/i)).toBeInTheDocument()
})

it('rejects an off-allowlist embed URL before sending it', async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    'fetch',
    mockFetch({
      'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
      'GET /api/content': { ok: true, json: async () => TOURS_CONTENT },
    }),
  )
  renderAdmin()

  await waitFor(() => expect(screen.getByRole('tab', { name: /360/i })).toBeInTheDocument())
  await user.click(screen.getByRole('tab', { name: /360/i }))

  await user.type(screen.getByLabelText(/tour name/i), 'Bad tour')
  await user.type(screen.getByLabelText(/embed url/i), 'https://evil.example.com/x')
  await user.click(screen.getByRole('button', { name: /add tour/i }))

  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(/kuula\.co or matterport\.com/i),
  )
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `yarn vitest run src/test/admin.test.jsx -t "tours"`
Expected: FAIL — the 360 tab still renders the placeholder

- [ ] **Step 3: Write `src/admin/ToursTab.jsx`**

```jsx
import { useState } from 'react'
import { createTour, patchTour, reorderTours, deleteTour, exportUrl } from './api.js'

// Mirrors the server's allowlist so a typo is caught before a round trip. The
// server still validates — this is convenience, not the control.
const ALLOWED = ['kuula.co', 'matterport.com']

function isAllowed(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return false
    return ALLOWED.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}

export default function ToursTab({ tours, onChange }) {
  const [title, setTitle] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const items = [...tours].sort((a, b) => a.sortOrder - b.sortOrder)

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onAdd(event) {
    event.preventDefault()
    if (!isAllowed(embedUrl)) {
      setError('Embed URL must be an https link to kuula.co or matterport.com.')
      return
    }
    await run(() => createTour({ title, embedUrl }))
    setTitle('')
    setEmbedUrl('')
  }

  function move(index, delta) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    run(() => reorderTours(next.map((t) => t.id)))
  }

  return (
    <div className="admin-panel">
      <ul className="admin-list">
        {items.map((tourItem, i) => (
          <li key={tourItem.id} className="admin-row">
            <div className="admin-row__fields">
              <label className="admin-field" htmlFor={`title-${tourItem.id}`}>
                Tour name
              </label>
              <input
                id={`title-${tourItem.id}`}
                className="admin-input"
                defaultValue={tourItem.title}
                onBlur={(e) => {
                  if (e.target.value !== tourItem.title)
                    run(() => patchTour(tourItem.id, { title: e.target.value }))
                }}
              />

              <label className="admin-field" htmlFor={`url-${tourItem.id}`}>
                Embed URL
              </label>
              <input
                id={`url-${tourItem.id}`}
                className="admin-input"
                defaultValue={tourItem.embedUrl}
                onBlur={(e) => {
                  if (e.target.value === tourItem.embedUrl) return
                  if (!isAllowed(e.target.value)) {
                    setError('Embed URL must be an https link to kuula.co or matterport.com.')
                    return
                  }
                  run(() => patchTour(tourItem.id, { embedUrl: e.target.value }))
                }}
              />

              {i === 0 && <p className="admin-hint">This tour is shown on the home page.</p>}
            </div>

            <div className="admin-row__actions">
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => move(i, -1)}
                disabled={busy || i === 0}
                aria-label={`Move ${tourItem.title} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => move(i, 1)}
                disabled={busy || i === items.length - 1}
                aria-label={`Move ${tourItem.title} later`}
              >
                ↓
              </button>

              {confirming === tourItem.id ? (
                <span className="admin-confirm">
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => {
                      setConfirming(null)
                      run(() => deleteTour(tourItem.id))
                    }}
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--quiet"
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => setConfirming(tourItem.id)}
                  aria-label={`Delete ${tourItem.title}`}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form className="admin-add" onSubmit={onAdd}>
        <h2 className="admin-add__title">Add a tour</h2>

        <label className="admin-field" htmlFor="new-title">
          Tour name
        </label>
        <input
          id="new-title"
          className="admin-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label className="admin-field" htmlFor="new-url">
          Embed URL
        </label>
        <input
          id="new-url"
          className="admin-input"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="https://kuula.co/share/collection/…"
          required
        />

        <button className="admin-button" type="submit" disabled={busy}>
          Add tour
        </button>
      </form>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <p className="admin-hint">
        Railway volumes are not backed up automatically.{' '}
        <a href={exportUrl}>Download a copy of your content</a> now and then, and keep your original
        photos.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Mount it in `AdminPage.jsx`**

```jsx
import ToursTab from '../admin/ToursTab.jsx'
```

```jsx
{
  tab === 'tours' && content && <ToursTab tours={content.tours} onChange={refresh} />
}
```

- [ ] **Step 5: Run the tests**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: PASS — including both axe assertions on the now-populated dashboard

- [ ] **Step 6: Commit**

```bash
git add src/admin/ToursTab.jsx src/pages/AdminPage.jsx src/admin/admin.css src/test/admin.test.jsx
git commit -m "feat(admin): tours tab with URL validation, reorder and content export"
```

---

### Task 14: Environment, docs, and full verification

**Files:**

- Modify: `.env.example`, `README.md`, `docs/ENVIRONMENTS.md`

- [ ] **Step 1: Document the new environment variables**

Append to `.env.example`:

```
# Admin dashboard. Generate the hash with:
#   yarn node scripts/hash-password.mjs 'the-password'
# The plaintext password is never stored in the repo — only in Railway and in
# whatever the client uses to remember it.
ADMIN_PASSWORD_HASH=

# Random string used to sign admin session cookies. Generate with:
#   openssl rand -hex 32
# Changing it signs everyone out.
SESSION_SECRET=

# Where content.json and uploads/ live. Railway mounts a volume here;
# locally this defaults to ./.data and can be left blank.
DATA_DIR=
```

- [ ] **Step 2: Document the Railway volume requirement**

Add a section to `docs/ENVIRONMENTS.md` after the environment table:

```markdown
## Admin dashboard storage

Both environments need a **Railway volume mounted at `/data`**, plus
`ADMIN_PASSWORD_HASH`, `SESSION_SECRET` and `DATA_DIR=/data`.

Without the volume the server writes to ephemeral container disk and **every
photo the client uploads is lost on the next deploy**, silently. Create the
volume before the first deploy of this feature.

Staging and production have separate volumes and therefore separate content.
Each self-seeds from the static content files on first boot, so a fresh
environment opens with the photo set that ships in the repo. The client edits
production.
```

- [ ] **Step 3: Document the dashboard in `README.md`**

Add a short section covering: the `/admin` URL, that the password is set via
`ADMIN_PASSWORD_HASH`, that `yarn dev` needs `yarn dev:api` alongside it, and
that the volume is required in production.

- [ ] **Step 4: Run the whole verification gate**

Run each and confirm it passes before moving on:

```bash
yarn lint
yarn format:check
yarn test
yarn build
```

Expected: all four clean. Fix anything that fails here rather than deferring it.

- [ ] **Step 5: Verify the production process end to end**

```bash
rm -rf .data
yarn build && yarn start
```

In another terminal:

```bash
curl -s localhost:4173/api/content | head -c 200          # seeded content
curl -s -o /dev/null -w '%{http_code}\n' localhost:4173/  # 200
curl -s -o /dev/null -w '%{http_code}\n' localhost:4173/admin  # 200 (SPA)
curl -s -X DELETE localhost:4173/api/photos/anything -o /dev/null -w '%{http_code}\n'  # 401
curl -sI localhost:4173/ | grep -i x-frame-options        # DENY
```

Expected: seeded JSON, `200`, `200`, `401`, `X-Frame-Options: DENY`.

- [ ] **Step 6: Run Lighthouse against the real server**

```bash
yarn dlx @lhci/cli autorun
```

Expected: performance ≥ 0.90, accessibility ≥ 0.90, SEO ≥ 0.95 on `/`.
If performance regressed, check whether `/api/content` is blocking first paint —
it should not be, since it is fetched at module scope and the home LCP is the
hero image.

- [ ] **Step 7: Walk the dashboard by hand**

With the server running, at `http://localhost:4173/admin`:

1. Sign in with the password you hashed.
2. Upload a photo to each of the three collections; confirm each appears on the right public surface (`/` interiors rail, `/gallery` exteriors band, `/gallery` mosaic).
3. Edit an alt text; reload the public page and confirm it changed.
4. Reorder two photos; confirm the public order matches.
5. Delete an uploaded photo; confirm the file is gone from `.data/uploads`.
6. Delete a _seeded_ photo; confirm the row disappears and `public/images/` is untouched.
7. Add a second tour; confirm `/360` shows a picker and `/` shows the first tour.
8. Paste a non-Kuula URL; confirm it is refused.
9. Sign out; confirm `/admin` returns to the login form and a `DELETE` via curl returns 401.

- [ ] **Step 8: Commit and open the PR**

```bash
git add .env.example README.md docs/ENVIRONMENTS.md
git commit -m "docs: admin dashboard setup, env vars and Railway volume requirement"
git push -u origin feature/admin-dashboard
gh pr create --base main --title "Admin dashboard: manage gallery photos and 360 tours" --body "See docs/superpowers/specs/2026-08-22-admin-dashboard-design.md"
```

- [ ] **Step 9: Confirm CI is green before calling this done**

Run: `gh pr checks --watch`
Expected: lint, format, test, build and Lighthouse all pass. A red check means the work is not finished.

---

## Deployment prerequisite

**Before the first deploy of this branch**, on _each_ Railway environment:

1. Create a volume mounted at `/data`.
2. Set `DATA_DIR=/data`, `ADMIN_PASSWORD_HASH=<generated>`, `SESSION_SECRET=<generated>`.
3. Deploy, then open `/admin` and confirm the seeded photo library is present.

Skipping step 1 does not fail loudly — it silently discards every upload on the next deploy.
