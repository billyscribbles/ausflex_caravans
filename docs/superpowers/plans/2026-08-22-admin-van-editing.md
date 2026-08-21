# Admin Van Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Ausflex staff add, edit, reorder and delete vans in the `/admin` dashboard — every detail field, the copy, the hero photo, the floorplan blueprint, the per-van photo gallery, and the `/vans` page intro — publishing live with no redeploy.

**Architecture:** `content.json` gains one top-level `vans` key holding the exact shape `src/content/vans.js` already exports, so seeding and client fallback are verbatim copies rather than translations. A new `server/routes/vans.js` mirrors the existing photos/tours route modules. A van's gallery photos are ordinary rows in the existing `photos` array under a `van:<id>` collection, which makes every existing photo route work on them unchanged. The three public van surfaces switch from a static import to the live store, falling back per-slice to the static file.

**Tech Stack:** Node 20, Express 4, multer, `node:crypto`, React 18, Vite 5, Vitest + supertest + Testing Library, Yarn 4 PnP.

**Spec:** `docs/superpowers/specs/2026-08-22-admin-van-editing-design.md`

## Global Constraints

- **No new design tokens, no raw hex/rem in component CSS.** Add to `src/config/theme.config.js` and expose via `applyTheme.js`. (`CLAUDE.md`)
- **No TypeScript, no Tailwind, no styled-components.** JSX + plain CSS with CSS variables.
- **No new dependencies.** Everything needed (`express`, `multer`, `supertest`) is already installed.
- **All Node invocations use `yarn node`,** never bare `node` — PnP will not resolve otherwise.
- **Never delete `src/content/vans.js`.** It is the seed source and the runtime fallback.
- **The server must boot with no `ADMIN_PASSWORD_HASH` set** (logins always fail) so CI needs no secrets.
- **CI must stay green:** `yarn lint && yarn format:check && yarn test && yarn build`, plus Lighthouse on `/` at performance ≥ 0.90, a11y ≥ 0.90, SEO ≥ 0.95.
- Field caps (spec §4.1), used verbatim in `validate.js`: `name` ≤ 80, `slug` ≤ 60, `length`/`tag`/`meta` ≤ 60, `blurb` ≤ 400, `imageAlt`/`floorplanAlt` ≤ 200, `description` ≤ 20 × 2000 chars, `specs` ≤ 12 × 60 chars, page `eyebrow`/`heading`/`sub` ≤ 300.
- Node version floor: 20 (`.nvmrc`).

## File Structure

**New**

| File                         | Responsibility                                                  |
| ---------------------------- | --------------------------------------------------------------- |
| `server/routes/vans.js`      | Van CRUD, reorder, page-intro patch, hero/floorplan upload      |
| `server/vans.routes.test.js` | Route coverage, mirroring `tours.routes.test.js`                |
| `src/admin/VansTab.jsx`      | Van list: add, reorder, delete, drill into the editor           |
| `src/admin/VanEditor.jsx`    | One van's form: identity, copy, specs, hero, floorplan, gallery |
| `src/admin/VansPageTab.jsx`  | The three `/vans` intro fields                                  |

**Modified**

| File                       | Change                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| `server/seed.js`           | Seed `vans` and its `van:<id>` photo rows                           |
| `server/store.js`          | Forward-migrate a content.json that predates `vans`                 |
| `server/validate.js`       | `isValidSlug`, `slugify`, `uniqueSlug`, `validateVanPatch`          |
| `server/app.js`            | Mount `/api/vans`                                                   |
| `server/routes/photos.js`  | Fixed collection allowlist becomes a predicate accepting `van:<id>` |
| `server/routes/content.js` | Return the `vans` slice with gallery photos attached                |
| `src/lib/contentStore.js`  | `vans` fallback + `useVans()`                                       |
| `src/components/Range.jsx` | Read live vans; `key` by id; placeholder for a null image           |
| `src/pages/VansPage.jsx`   | Read live intro copy                                                |
| `src/pages/VanPage.jsx`    | Read live van; loading guard; null-safe fields                      |
| `src/pages/VanPage.css`    | Loading state                                                       |
| `src/admin/api.js`         | Van fetch wrappers                                                  |
| `src/pages/AdminPage.jsx`  | "Range" nav group, van counts, panel routing                        |
| `src/admin/admin.css`      | Back link, editor sections, single-image slot, spec rows            |
| `README.md`                | Document van management                                             |

**Decomposition note (refines spec §6.1):** the spec described the list and the editor as "two states in one component". This plan splits them into `VansTab.jsx` and `VanEditor.jsx`, because one file carrying both would run past 400 lines and no other admin file does. `VansTab` owns the selection state and renders one or the other.

---

### Task 1: Seed vans and forward-migrate existing content.json

**Files:**

- Modify: `server/seed.js`
- Modify: `server/store.js:29-46` (the `load` function)
- Test: `server/store.test.js`, `src/test/content.test.js`

**Interfaces:**

- Consumes: `vans` from `src/content/vans.js`.
- Produces: `buildVans()` returning `{ vans: { eyebrow, heading, sub, items }, photos }`; `content.vans.items[]` each with `id`, `slug`, `sortOrder`, `createdAt`; van gallery rows in `content.photos` with `collection: 'van:<id>'`.

- [ ] **Step 1: Write the failing store tests**

Append to `server/store.test.js`, inside the existing `describe('store', ...)`:

```js
it('seeds the van range from the static content file', async () => {
  const store = await freshStore()
  const content = await store.load()

  expect(content.vans.heading).toBeTruthy()
  expect(content.vans.items.length).toBeGreaterThan(0)

  for (const van of content.vans.items) {
    expect(van.id).toBeTruthy()
    expect(van.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(Array.isArray(van.description)).toBe(true)
    expect(Array.isArray(van.specs)).toBe(true)
    // Gallery photos live in the photos array, never nested on the van.
    expect(van.photos).toBeUndefined()
  }

  const ids = content.vans.items.map((v) => v.id)
  expect(new Set(ids).size).toBe(ids.length)
})

it('seeds each van gallery photo under its own van: collection', async () => {
  const store = await freshStore()
  const content = await store.load()

  const vanRows = content.photos.filter((p) => p.collection.startsWith('van:'))
  expect(vanRows.length).toBeGreaterThan(0)
  expect(vanRows.every((p) => p.src.startsWith('/images/'))).toBe(true)

  const known = new Set(content.vans.items.map((v) => `van:${v.id}`))
  expect(vanRows.every((p) => known.has(p.collection))).toBe(true)
})

it('migrates a content.json that predates vans without discarding uploads', async () => {
  const uploaded = {
    id: 'kept-photo',
    collection: 'page',
    src: '/uploads/kept.webp',
    alt: 'An upload the client made',
    caption: '',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
  await writeFile(
    join(dir, 'content.json'),
    JSON.stringify({ version: 1, photos: [uploaded], tours: [] }),
  )

  const store = await freshStore()
  const content = await store.load()

  // The migration backfills vans...
  expect(content.vans.items.length).toBeGreaterThan(0)
  // ...without rebuilding the file from scratch, which would orphan this.
  expect(content.photos.find((p) => p.id === 'kept-photo')).toEqual(uploaded)
  expect(content.tours).toEqual([])

  // And it persists, so the next boot does no work.
  const onDisk = JSON.parse(await readFile(join(dir, 'content.json'), 'utf8'))
  expect(onDisk.vans.items.length).toBe(content.vans.items.length)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run server/store.test.js`
Expected: FAIL — `content.vans` is undefined.

- [ ] **Step 3: Add `buildVans` to `server/seed.js`**

Add the import at the top, next to the existing ones:

```js
import { vans } from '../src/content/vans.js'
```

Add the exported builder below `COLLECTIONS`:

```js
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
```

Then wire it into `buildSeed`, replacing the final `return`:

```js
const seededVans = buildVans(now)
photos.push(...seededVans.photos)

return { version: 1, photos, tours, vans: seededVans.vans }
```

- [ ] **Step 4: Rewrite `load` in `server/store.js`**

Replace the whole `load` function. The restructure matters: the migration's
`persist()` must sit outside the `try`, or a write failure would fall into the
catch and rebuild the file from seed — orphaning every uploaded photo.

```js
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

  return cache
}
```

Update the import at the top of `store.js`:

```js
import { buildSeed, buildVans } from './seed.js'
```

- [ ] **Step 5: Run the store tests to verify they pass**

Run: `yarn vitest run server/store.test.js`
Expected: PASS, all tests including the three pre-existing ones.

- [ ] **Step 6: Add the static-file shape contract**

Append to `src/test/content.test.js`. Add `import { vans } from '../content/vans.js'` to the
imports at the top, then inside the existing `describe('content — section copy contract', ...)`:

```js
it('vans has intro copy and items with the shape the van pages render', () => {
  expect(vans.heading).toBeTruthy()
  expect(vans.items.length).toBeGreaterThan(0)
  for (const van of vans.items) {
    expect(van.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(van.name).toBeTruthy()
    expect(Array.isArray(van.description)).toBe(true)
    expect(Array.isArray(van.specs)).toBe(true)
    expect(Array.isArray(van.photos)).toBe(true)
  }
  const slugs = vans.items.map((v) => v.slug)
  expect(new Set(slugs).size).toBe(slugs.length)
})
```

- [ ] **Step 7: Run the full suite**

Run: `yarn test`
Expected: PASS. `server/api.test.js` still passes — `/api/content` ignores the new key for now.

- [ ] **Step 8: Commit**

```bash
git add server/seed.js server/store.js server/store.test.js src/test/content.test.js
git commit -m "feat(server): seed the van range and migrate content.json in place"
```

---

### Task 2: Van validation helpers

**Files:**

- Modify: `server/validate.js`
- Test: `server/validate.test.js`

**Interfaces:**

- Produces: `isValidSlug(value) -> boolean`, `slugify(name) -> string`, `uniqueSlug(name, takenArray) -> string`, `validateVanPatch(patch) -> string | null` (an error message, or null when valid), and the exported cap constants.

- [ ] **Step 1: Write the failing tests**

Append to `server/validate.test.js`. Add the new names to the existing import from
`./validate.js`, then:

```js
describe('isValidSlug', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(isValidSlug('tuff-mudder')).toBe(true)
    expect(isValidSlug('van21')).toBe(true)
  })

  it('rejects anything that would not survive a URL', () => {
    for (const bad of ['', 'Tuff Mudder', 'tuff_mudder', '-leading', 'trailing-', 'a--b', '../x']) {
      expect(isValidSlug(bad)).toBe(false)
    }
    expect(isValidSlug('a'.repeat(61))).toBe(false)
    expect(isValidSlug(null)).toBe(false)
  })
})

describe('slugify', () => {
  it('turns a display name into a slug', () => {
    expect(slugify('Fierce Couple Deluxe')).toBe('fierce-couple-deluxe')
    expect(slugify('  On-Site Caravans!  ')).toBe('on-site-caravans')
    expect(slugify('18.6ft Family')).toBe('18-6ft-family')
  })

  it('never returns an empty slug', () => {
    expect(slugify('!!!')).toBe('van')
  })
})

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', () => {
    expect(uniqueSlug('Little Wonder', ['tuff-mudder'])).toBe('little-wonder')
  })

  it('suffixes until it finds a free slug', () => {
    expect(uniqueSlug('Little Wonder', ['little-wonder'])).toBe('little-wonder-2')
    expect(uniqueSlug('Little Wonder', ['little-wonder', 'little-wonder-2'])).toBe(
      'little-wonder-3',
    )
  })
})

describe('validateVanPatch', () => {
  it('accepts an empty patch and a full valid one', () => {
    expect(validateVanPatch({})).toBeNull()
    expect(
      validateVanPatch({
        name: 'Tuff Mudder',
        slug: 'tuff-mudder',
        blurb: 'Small in size.',
        description: ['One.', 'Two.'],
        specs: ['12ft body'],
      }),
    ).toBeNull()
  })

  it('rejects over-long text', () => {
    expect(validateVanPatch({ name: 'a'.repeat(81) })).toMatch(/name/)
    expect(validateVanPatch({ blurb: 'a'.repeat(401) })).toMatch(/blurb/)
  })

  it('rejects a malformed slug', () => {
    expect(validateVanPatch({ slug: 'Not A Slug' })).toMatch(/slug/)
  })

  it('rejects lists that are not lists of strings', () => {
    expect(validateVanPatch({ description: 'not a list' })).toMatch(/description/)
    expect(validateVanPatch({ specs: [1, 2] })).toMatch(/spec/)
    expect(validateVanPatch({ specs: new Array(13).fill('x') })).toMatch(/specs/)
    expect(validateVanPatch({ description: ['a'.repeat(2001)] })).toMatch(/paragraph/)
  })

  it('rejects a non-string where text is expected', () => {
    expect(validateVanPatch({ name: 42 })).toMatch(/name/)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run server/validate.test.js`
Expected: FAIL — `isValidSlug is not a function`.

- [ ] **Step 3: Implement in `server/validate.js`**

Append below the existing exports:

```js
// Slugs land in a URL segment and in a React key, so they are constrained
// rather than merely trimmed.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const VAN_TEXT_LIMITS = {
  name: 80,
  slug: 60,
  length: 60,
  tag: 60,
  meta: 60,
  blurb: 400,
  imageAlt: 200,
  floorplanAlt: 200,
}

export const MAX_DESCRIPTION_ITEMS = 20
export const MAX_DESCRIPTION_CHARS = 2000
export const MAX_SPEC_ITEMS = 12
export const MAX_SPEC_CHARS = 60
export const MAX_PAGE_CHARS = 300

export function isValidSlug(value) {
  return typeof value === 'string' && value.length <= VAN_TEXT_LIMITS.slug && SLUG_RE.test(value)
}

export function slugify(name) {
  const base = String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, VAN_TEXT_LIMITS.slug)
    .replace(/^-+|-+$/g, '')
  return base || 'van'
}

export function uniqueSlug(name, taken) {
  const base = slugify(name)
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

function listError(value, label, maxItems, maxChars) {
  if (!Array.isArray(value)) return `${label} must be a list`
  if (value.length > maxItems) return `${label} must be ${maxItems} entries or fewer`
  if (value.some((entry) => typeof entry !== 'string')) return `${label} must be a list of text`
  if (value.some((entry) => entry.length > maxChars)) {
    return `each ${label === 'description' ? 'paragraph' : 'spec'} must be ${maxChars} characters or fewer`
  }
  return null
}

// Returns an error message, or null when the patch is acceptable. These are
// guardrails against a paste accident, not a security boundary — express.json's
// 256kb limit is that.
export function validateVanPatch(patch) {
  for (const [field, max] of Object.entries(VAN_TEXT_LIMITS)) {
    const value = patch?.[field]
    if (value === undefined) continue
    if (typeof value !== 'string') return `${field} must be text`
    if (value.length > max) return `${field} must be ${max} characters or fewer`
  }
  if (patch?.slug !== undefined && !isValidSlug(patch.slug)) {
    return 'slug must be lowercase letters, numbers and hyphens'
  }
  if (patch?.description !== undefined) {
    const error = listError(
      patch.description,
      'description',
      MAX_DESCRIPTION_ITEMS,
      MAX_DESCRIPTION_CHARS,
    )
    if (error) return error
  }
  if (patch?.specs !== undefined) {
    const error = listError(patch.specs, 'specs', MAX_SPEC_ITEMS, MAX_SPEC_CHARS)
    if (error) return error
  }
  return null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run server/validate.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/validate.js server/validate.test.js
git commit -m "feat(server): slug and field validation for vans"
```

---

### Task 3: `/api/vans` core routes

**Files:**

- Create: `server/routes/vans.js`
- Modify: `server/app.js:44` (route mounting)
- Test: Create `server/vans.routes.test.js`

**Interfaces:**

- Consumes: `read`, `mutate` from `../store.js`; `uniqueSlug`, `validateVanPatch`, `MAX_PAGE_CHARS` from `../validate.js`; `requireAuth` from `./auth.js`.
- Produces: `PATCH /api/vans/page` → `{ page }`; `POST /api/vans` → 201 `{ van }`; `POST /api/vans/reorder` → `{ ok: true }`; `PATCH /api/vans/:id` → `{ van }`. Task 5 adds `POST /api/vans/:id/image` and `DELETE /api/vans/:id` to this same file.

- [ ] **Step 1: Write the failing tests**

Create `server/vans.routes.test.js`. The harness is copied from
`tours.routes.test.js` — do not try to share it, the other route test files each
carry their own for isolation.

```js
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from './auth.js'

const PASSWORD = 'test-password-123'
// scrypt is deliberately slow — hash once for the whole file, not per test.
const HASH = await hashPassword(PASSWORD)

let dir
let app
let store

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ausflex-vans-'))
  process.env.DATA_DIR = dir
  process.env.SESSION_SECRET = 'test-session-secret'
  vi.resetModules()

  process.env.ADMIN_PASSWORD_HASH = HASH
  const auth = await import('./auth.js')
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

const firstVan = () => store.read().vans.items[0]

describe('authorisation', () => {
  it('refuses every unauthenticated mutation', async () => {
    const target = firstVan()
    await request(app).post('/api/vans').send({ name: 'x' }).expect(401)
    await request(app).patch('/api/vans/page').send({ heading: 'x' }).expect(401)
    await request(app).patch(`/api/vans/${target.id}`).send({ name: 'x' }).expect(401)
    await request(app).post('/api/vans/reorder').send({ ids: [] }).expect(401)
  })
})

describe('PATCH /api/vans/page', () => {
  it('updates the intro copy without touching the items', async () => {
    const cookie = await login()
    const before = store.read().vans.items.length

    const res = await request(app)
      .patch('/api/vans/page')
      .set('Cookie', cookie)
      .send({ heading: 'Every adventure, covered.' })
      .expect(200)

    expect(res.body.page.heading).toBe('Every adventure, covered.')
    expect(res.body.page.items).toBeUndefined()
    expect(store.read().vans.heading).toBe('Every adventure, covered.')
    expect(store.read().vans.items.length).toBe(before)
  })

  it('rejects over-long copy', async () => {
    const cookie = await login()
    await request(app)
      .patch('/api/vans/page')
      .set('Cookie', cookie)
      .send({ sub: 'a'.repeat(301) })
      .expect(400)
  })
})

describe('POST /api/vans', () => {
  it('creates a van at the end with a derived slug', async () => {
    const cookie = await login()
    const before = store.read().vans.items.length

    const res = await request(app)
      .post('/api/vans')
      .set('Cookie', cookie)
      .send({ name: 'Desert Runner' })
      .expect(201)

    expect(res.body.van.slug).toBe('desert-runner')
    expect(res.body.van.description).toEqual([])
    expect(res.body.van.specs).toEqual([])
    expect(res.body.van.image).toBeNull()

    const items = store.read().vans.items
    expect(items.length).toBe(before + 1)
    expect(Math.max(...items.map((v) => v.sortOrder))).toBe(res.body.van.sortOrder)
  })

  it('suffixes a slug that is already taken', async () => {
    const cookie = await login()
    const name = firstVan().name

    const res = await request(app)
      .post('/api/vans')
      .set('Cookie', cookie)
      .send({ name })
      .expect(201)

    expect(res.body.van.slug).toMatch(/-2$/)
  })

  it('requires a name', async () => {
    const cookie = await login()
    await request(app).post('/api/vans').set('Cookie', cookie).send({}).expect(400)
    await request(app).post('/api/vans').set('Cookie', cookie).send({ name: '   ' }).expect(400)
  })
})

describe('PATCH /api/vans/:id', () => {
  it('updates text, paragraphs and specs', async () => {
    const cookie = await login()
    const target = firstVan()

    const res = await request(app)
      .patch(`/api/vans/${target.id}`)
      .set('Cookie', cookie)
      .send({
        name: 'Tuff Mudder II',
        length: '13ft',
        description: ['First paragraph.', '   ', 'Second paragraph.'],
        specs: ['13ft body', ''],
      })
      .expect(200)

    expect(res.body.van.name).toBe('Tuff Mudder II')
    // Blank entries are filtered rather than rejected.
    expect(res.body.van.description).toEqual(['First paragraph.', 'Second paragraph.'])
    expect(res.body.van.specs).toEqual(['13ft body'])
  })

  it('404s an unknown van', async () => {
    const cookie = await login()
    await request(app).patch('/api/vans/nope').set('Cookie', cookie).send({ name: 'x' }).expect(404)
  })

  it('rejects a malformed slug and a slug already in use', async () => {
    const cookie = await login()
    const [first, second] = store.read().vans.items

    await request(app)
      .patch(`/api/vans/${first.id}`)
      .set('Cookie', cookie)
      .send({ slug: 'Not A Slug' })
      .expect(400)

    await request(app)
      .patch(`/api/vans/${first.id}`)
      .set('Cookie', cookie)
      .send({ slug: second.slug })
      .expect(400)
  })

  it('allows a van to keep its own slug', async () => {
    const cookie = await login()
    const target = firstVan()
    await request(app)
      .patch(`/api/vans/${target.id}`)
      .set('Cookie', cookie)
      .send({ slug: target.slug })
      .expect(200)
  })
})

describe('POST /api/vans/reorder', () => {
  it('rewrites sortOrder to match the given order', async () => {
    const cookie = await login()
    const ids = store.read().vans.items.map((v) => v.id)
    const reversed = [...ids].reverse()

    await request(app)
      .post('/api/vans/reorder')
      .set('Cookie', cookie)
      .send({ ids: reversed })
      .expect(200)

    const sorted = [...store.read().vans.items].sort((a, b) => a.sortOrder - b.sortOrder)
    expect(sorted.map((v) => v.id)).toEqual(reversed)
  })

  it('requires an ids array', async () => {
    const cookie = await login()
    await request(app).post('/api/vans/reorder').set('Cookie', cookie).send({}).expect(400)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run server/vans.routes.test.js`
Expected: FAIL — every mutation returns 404, nothing is mounted at `/api/vans`.

- [ ] **Step 3: Create `server/routes/vans.js`**

```js
import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { read, mutate } from '../store.js'
import { uniqueSlug, validateVanPatch, MAX_PAGE_CHARS } from '../validate.js'
import { requireAuth } from './auth.js'

const TEXT_FIELDS = ['slug', 'name', 'length', 'tag', 'meta', 'blurb', 'imageAlt', 'floorplanAlt']
const LIST_FIELDS = ['description', 'specs']
const PAGE_FIELDS = ['eyebrow', 'heading', 'sub']

const router = Router()
router.use(requireAuth)

const findVan = (id) => read().vans.items.find((v) => v.id === id)

// Literal segments must register before /:id, or "page" and "reorder" are read
// as van ids. Same ordering rule tours.js follows for /reorder.
router.patch('/page', async (req, res) => {
  for (const field of PAGE_FIELDS) {
    const value = req.body?.[field]
    if (value === undefined) continue
    if (typeof value !== 'string' || value.length > MAX_PAGE_CHARS) {
      res.status(400).json({ error: `${field} must be ${MAX_PAGE_CHARS} characters or fewer` })
      return
    }
  }

  const page = await mutate((content) => {
    for (const field of PAGE_FIELDS) {
      if (req.body?.[field] !== undefined) content.vans[field] = req.body[field]
    }
    const { eyebrow, heading, sub } = content.vans
    return { eyebrow, heading, sub }
  })

  res.json({ page })
})

router.post('/reorder', async (req, res) => {
  const { ids } = req.body ?? {}
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'ids is required' })
    return
  }
  await mutate((content) => {
    ids.forEach((id, index) => {
      const target = content.vans.items.find((v) => v.id === id)
      if (target) target.sortOrder = index
    })
  })
  res.json({ ok: true })
})

router.post('/', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const error = validateVanPatch({ name })
  if (error) {
    res.status(400).json({ error })
    return
  }

  // Everything but the name starts empty, so a van can be filled in over
  // several saves rather than one long form submission.
  const van = {
    id: randomUUID(),
    slug: '',
    name,
    length: '',
    tag: '',
    meta: '',
    blurb: '',
    description: [],
    specs: [],
    image: null,
    imageAlt: '',
    floorplan: null,
    floorplanAlt: '',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  }

  await mutate((content) => {
    const items = content.vans.items
    van.slug = uniqueSlug(
      name,
      items.map((v) => v.slug),
    )
    van.sortOrder = items.length ? Math.max(...items.map((v) => v.sortOrder)) + 1 : 0
    items.push(van)
  })

  res.status(201).json({ van })
})

router.patch('/:id', async (req, res) => {
  if (!findVan(req.params.id)) {
    res.status(404).json({ error: 'not found' })
    return
  }

  const error = validateVanPatch(req.body ?? {})
  if (error) {
    res.status(400).json({ error })
    return
  }

  if (
    req.body?.slug !== undefined &&
    read().vans.items.some((v) => v.id !== req.params.id && v.slug === req.body.slug)
  ) {
    res.status(400).json({ error: 'another van already uses that URL' })
    return
  }

  const van = await mutate((content) => {
    const target = content.vans.items.find((v) => v.id === req.params.id)
    for (const field of TEXT_FIELDS) {
      if (req.body?.[field] !== undefined) target[field] = req.body[field]
    }
    // A trailing blank paragraph is a typing artefact, not an instruction.
    for (const field of LIST_FIELDS) {
      if (req.body?.[field] !== undefined) {
        target[field] = req.body[field].map((entry) => entry.trim()).filter(Boolean)
      }
    }
    return target
  })

  res.json({ van })
})

export default router
```

- [ ] **Step 4: Mount it in `server/app.js`**

Add the import beside the other route imports:

```js
import vanRoutes from './routes/vans.js'
```

Add the mount directly after the `/api/tours` line:

```js
app.use('/api/vans', vanRoutes)
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run server/vans.routes.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/routes/vans.js server/app.js server/vans.routes.test.js
git commit -m "feat(server): van CRUD, reorder and page-intro routes"
```

---

### Task 4: Accept `van:<id>` photo collections

**Files:**

- Modify: `server/routes/photos.js:11` and the three collection checks
- Test: `server/photos.routes.test.js`

**Interfaces:**

- Produces: `/api/photos` accepts `collection: "van:<id>"` for any existing van, on upload, reorder and patch. Task 5 and Task 12 both depend on this.

- [ ] **Step 1: Write the failing tests**

Append to `server/photos.routes.test.js`, inside the top-level describe block.
Reuse the file's existing `PNG` fixture and `login()` helper.

```js
describe('van gallery collections', () => {
  it('accepts an upload into a real van collection', async () => {
    const cookie = await login()
    const van = store.read().vans.items[0]

    const res = await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', `van:${van.id}`)
      .field('alt', 'Interior shot')
      .attach('file', PNG, 'photo.png')
      .expect(201)

    expect(res.body.photo.collection).toBe(`van:${van.id}`)
    expect(res.body.photo.src).toMatch(/^\/uploads\//)
  })

  it('refuses a van collection that does not exist', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'van:00000000-0000-0000-0000-000000000000')
      .attach('file', PNG, 'photo.png')
      .expect(400)
  })

  it('refuses a collection that is neither named nor a van', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', 'vans')
      .attach('file', PNG, 'photo.png')
      .expect(400)
  })

  it('reorders within a van collection', async () => {
    const cookie = await login()
    const van = store.read().vans.items[0]
    const collection = `van:${van.id}`

    for (const alt of ['one', 'two']) {
      await request(app)
        .post('/api/photos')
        .set('Cookie', cookie)
        .field('collection', collection)
        .field('alt', alt)
        .attach('file', PNG, 'photo.png')
        .expect(201)
    }

    const before = store
      .read()
      .photos.filter((p) => p.collection === collection)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const reversed = [...before].reverse().map((p) => p.id)

    await request(app)
      .post('/api/photos/reorder')
      .set('Cookie', cookie)
      .send({ collection, ids: reversed })
      .expect(200)

    const after = store
      .read()
      .photos.filter((p) => p.collection === collection)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    expect(after.map((p) => p.id)).toEqual(reversed)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run server/photos.routes.test.js`
Expected: FAIL — "unknown collection", because `COLLECTIONS` is a fixed array.

- [ ] **Step 3: Replace the allowlist with a predicate**

In `server/routes/photos.js`, replace the `COLLECTIONS` constant:

```js
const NAMED_COLLECTIONS = ['interiors', 'exteriors', 'page']

// A van's gallery is an ordinary photo collection named after its id, so every
// route in this file works on it unchanged. The van must exist — an arbitrary
// "van:" string would otherwise create rows nothing can ever reach.
function isValidCollection(value) {
  if (NAMED_COLLECTIONS.includes(value)) return true
  if (typeof value !== 'string' || !value.startsWith('van:')) return false
  return read().vans.items.some((van) => `van:${van.id}` === value)
}
```

Then replace all three usages:

- In `POST /`: `if (!COLLECTIONS.includes(collection)) {` → `if (!isValidCollection(collection)) {`
- In `POST /reorder`: `if (!COLLECTIONS.includes(collection) || !Array.isArray(ids)) {` → `if (!isValidCollection(collection) || !Array.isArray(ids)) {`
- In `PATCH /:id`: `if (req.body?.collection !== undefined && !COLLECTIONS.includes(req.body.collection)) {` → `if (req.body?.collection !== undefined && !isValidCollection(req.body.collection)) {`

`read` is already imported in this file, so no import change is needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run server/photos.routes.test.js`
Expected: PASS, including the pre-existing tests that assert `interiors` still works.

- [ ] **Step 5: Commit**

```bash
git add server/routes/photos.js server/photos.routes.test.js
git commit -m "feat(server): photos routes accept a van's own gallery collection"
```

---

### Task 5: Hero/floorplan upload and delete cascade

**Files:**

- Modify: `server/routes/vans.js`
- Test: `server/vans.routes.test.js`

**Interfaces:**

- Consumes: `isValidCollection` behaviour from Task 4 (the tests create van photos).
- Produces: `POST /api/vans/:id/image` (multipart `file`, field `field` = `image` | `floorplan`) → `{ van }`; `DELETE /api/vans/:id` → `{ ok: true }`.

- [ ] **Step 1: Write the failing tests**

Append to `server/vans.routes.test.js`. Add these imports at the top of the file,
beside the existing ones:

```js
import { readdir } from 'node:fs/promises'
```

Add the PNG fixture below the `HASH` constant:

```js
// Smallest valid PNG — multer sniffs the mimetype from the part headers, but a
// real byte payload keeps the test honest about what lands on disk.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
```

Then the tests:

```js
describe('POST /api/vans/:id/image', () => {
  it('sets the hero image from an upload', async () => {
    const cookie = await login()
    const target = firstVan()

    const res = await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'hero.png')
      .expect(200)

    expect(res.body.van.image).toMatch(/^\/uploads\/.+\.png$/)
    expect(store.read().vans.items.find((v) => v.id === target.id).image).toBe(res.body.van.image)
  })

  it('sets the floorplan independently of the hero image', async () => {
    const cookie = await login()
    const target = firstVan()
    const originalHero = target.image

    const res = await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'floorplan')
      .attach('file', PNG, 'plan.png')
      .expect(200)

    expect(res.body.van.floorplan).toMatch(/^\/uploads\//)
    expect(res.body.van.image).toBe(originalHero)
  })

  it('deletes the file it replaced, but never a seeded /images path', async () => {
    const cookie = await login()
    const target = firstVan()
    expect(target.image.startsWith('/images/')).toBe(true)

    const first = await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'one.png')
      .expect(200)

    // The seeded /images/ path is part of the build; nothing was unlinked.
    expect(await readdir(join(dir, 'uploads'))).toHaveLength(1)

    await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'two.png')
      .expect(200)

    // The first upload replaced itself rather than accumulating.
    const files = await readdir(join(dir, 'uploads'))
    expect(files).toHaveLength(1)
    expect(files[0]).not.toBe(first.body.van.image.split('/').pop())
  })

  it('rejects an unknown field and a non-image', async () => {
    const cookie = await login()
    const target = firstVan()

    await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'blurb')
      .attach('file', PNG, 'x.png')
      .expect(400)

    await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', Buffer.from('<html>hi</html>'), {
        filename: 'x.html',
        contentType: 'text/html',
      })
      .expect(400)
  })

  it('404s an unknown van and 401s without a session', async () => {
    const cookie = await login()
    await request(app)
      .post('/api/vans/nope/image')
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'x.png')
      .expect(404)

    await request(app)
      .post(`/api/vans/${firstVan().id}/image`)
      .field('field', 'image')
      .attach('file', PNG, 'x.png')
      .expect(401)
  })
})

describe('DELETE /api/vans/:id', () => {
  it('removes the van, its gallery rows and their files', async () => {
    const cookie = await login()
    const target = firstVan()
    const collection = `van:${target.id}`

    await request(app)
      .post('/api/photos')
      .set('Cookie', cookie)
      .field('collection', collection)
      .attach('file', PNG, 'gallery.png')
      .expect(201)

    await request(app)
      .post(`/api/vans/${target.id}/image`)
      .set('Cookie', cookie)
      .field('field', 'image')
      .attach('file', PNG, 'hero.png')
      .expect(200)

    expect(await readdir(join(dir, 'uploads'))).toHaveLength(2)

    await request(app).delete(`/api/vans/${target.id}`).set('Cookie', cookie).expect(200)

    expect(store.read().vans.items.find((v) => v.id === target.id)).toBeUndefined()
    expect(store.read().photos.some((p) => p.collection === collection)).toBe(false)
    expect(await readdir(join(dir, 'uploads'))).toHaveLength(0)
  })

  it('leaves other vans and the named collections alone', async () => {
    const cookie = await login()
    const [target, survivor] = store.read().vans.items
    const interiorsBefore = store.read().photos.filter((p) => p.collection === 'interiors').length

    await request(app).delete(`/api/vans/${target.id}`).set('Cookie', cookie).expect(200)

    expect(store.read().vans.items.find((v) => v.id === survivor.id)).toBeTruthy()
    expect(store.read().photos.filter((p) => p.collection === 'interiors')).toHaveLength(
      interiorsBefore,
    )
  })

  it('404s an unknown van and 401s without a session', async () => {
    const cookie = await login()
    await request(app).delete('/api/vans/nope').set('Cookie', cookie).expect(404)
    await request(app).delete(`/api/vans/${firstVan().id}`).expect(401)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run server/vans.routes.test.js`
Expected: FAIL — `POST /api/vans/:id/image` and `DELETE /api/vans/:id` are unrouted.

- [ ] **Step 3: Add the two routes to `server/routes/vans.js`**

Extend the imports at the top of the file:

```js
import multer from 'multer'
import { writeFile, unlink } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { read, mutate, uploadsDir } from '../store.js'
import {
  uniqueSlug,
  validateVanPatch,
  extForMime,
  MAX_UPLOAD_BYTES,
  MAX_PAGE_CHARS,
} from '../validate.js'
```

Add below the `PAGE_FIELDS` constant:

```js
const IMAGE_FIELDS = ['image', 'floorplan']

// Same settings as photos.js: the browser has already resized, and memory
// storage lets us validate the type before anything touches disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } })

// Seeded rows point at /images/*, which ships with the build and must stay.
// Only uploaded files are ours to remove.
async function removeUpload(src) {
  if (typeof src === 'string' && src.startsWith('/uploads/')) {
    await unlink(join(uploadsDir(), basename(src))).catch(() => {})
  }
}
```

Add both routes at the end of the file, before `export default router`:

```js
router.post('/:id/image', upload.single('file'), async (req, res) => {
  const field = req.body?.field
  if (!IMAGE_FIELDS.includes(field)) {
    res.status(400).json({ error: 'field must be image or floorplan' })
    return
  }

  const existing = findVan(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'not found' })
    return
  }

  const ext = extForMime(req.file?.mimetype)
  if (!req.file || !ext) {
    res.status(400).json({ error: 'file must be a webp, jpeg or png image' })
    return
  }

  // The filename is ours, never the client's — see photos.js for why.
  const previous = existing[field]
  const name = `${randomUUID()}.${ext}`
  await writeFile(join(uploadsDir(), name), req.file.buffer)

  const van = await mutate((content) => {
    const target = content.vans.items.find((v) => v.id === req.params.id)
    target[field] = `/uploads/${name}`
    return target
  })

  // Only after the new path is committed, so a failed unlink cannot orphan the
  // record from its image.
  await removeUpload(previous)

  res.json({ van })
})

router.delete('/:id', async (req, res) => {
  const van = findVan(req.params.id)
  if (!van) {
    res.status(404).json({ error: 'not found' })
    return
  }

  const collection = `van:${van.id}`
  const orphaned = read()
    .photos.filter((p) => p.collection === collection)
    .map((p) => p.src)

  // Van and gallery rows go in one mutation, so a crash cannot half-apply it.
  await mutate((content) => {
    content.vans.items = content.vans.items.filter((v) => v.id !== req.params.id)
    content.photos = content.photos.filter((p) => p.collection !== collection)
  })

  for (const src of [...orphaned, van.image, van.floorplan]) {
    await removeUpload(src)
  }

  res.json({ ok: true })
})
```

- [ ] **Step 4: Re-export the upload constants from `validate.js`**

`extForMime` and `MAX_UPLOAD_BYTES` already live in `server/validate.js` and are
already exported — confirm with:

Run: `grep -n "export .*extForMime\|export const MAX_UPLOAD_BYTES" server/validate.js`
Expected: both lines present. No change needed.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run server/vans.routes.test.js server/photos.routes.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/routes/vans.js server/vans.routes.test.js
git commit -m "feat(server): van hero and floorplan uploads, delete cascade"
```

---

### Task 6: Expose vans on `/api/content`

**Files:**

- Modify: `server/routes/content.js:11-27`
- Test: `server/api.test.js`

**Interfaces:**

- Produces: `GET /api/content` → `{ gallery, tours, vans: { eyebrow, heading, sub, items: [{ ...van, photos: [] }] } }`, items sorted by `sortOrder`, each van's `photos` sorted by `sortOrder`.

- [ ] **Step 1: Write the failing tests**

Append to `server/api.test.js`, inside its existing describe block:

```js
it('returns the van range sorted, with each gallery attached', async () => {
  const res = await request(app).get('/api/content').expect(200)

  expect(res.body.vans.heading).toBeTruthy()
  expect(res.body.vans.items.length).toBeGreaterThan(0)

  const orders = res.body.vans.items.map((v) => v.sortOrder)
  expect(orders).toEqual([...orders].sort((a, b) => a - b))

  const withPhotos = res.body.vans.items.find((v) => v.photos.length > 0)
  expect(withPhotos).toBeTruthy()
  expect(withPhotos.photos[0].src).toBeTruthy()

  // The van collections never leak into the public gallery keys.
  expect(Object.keys(res.body.gallery)).toEqual(['interiors', 'exteriors', 'page'])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run server/api.test.js`
Expected: FAIL — `res.body.vans` is undefined.

- [ ] **Step 3: Add the vans slice in `server/routes/content.js`**

Replace the `JSON.stringify({...})` block:

```js
const body = JSON.stringify({
  gallery: {
    interiors: of('interiors'),
    exteriors: of('exteriors'),
    page: of('page'),
  },
  tours: [...content.tours].sort(byOrder),
  // Each van carries its own gallery, so the client never has to join two
  // arrays to render a detail page.
  vans: {
    eyebrow: content.vans.eyebrow,
    heading: content.vans.heading,
    sub: content.vans.sub,
    items: [...content.vans.items]
      .sort(byOrder)
      .map((van) => ({ ...van, photos: of(`van:${van.id}`) })),
  },
})
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run server/api.test.js`
Expected: PASS. The ETag test still passes — the hash is computed from the body after this change.

- [ ] **Step 5: Commit**

```bash
git add server/routes/content.js server/api.test.js
git commit -m "feat(server): serve the van range from /api/content"
```

---

### Task 7: `useVans()` in the content store

**Files:**

- Modify: `src/lib/contentStore.js`
- Test: `src/test/contentStore.test.js`

**Interfaces:**

- Produces: `useVans() -> { loading: boolean, vans: { eyebrow, heading, sub, items: [] } }`. Tasks 8, 10, 11, 12 and 13 consume it.

- [ ] **Step 1: Write the failing tests**

Append to `src/test/contentStore.test.js`. First extend the `LIVE` fixture at
the top of the file with a `vans` key:

```js
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
```

Then the tests:

```js
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
    const { vans, ...withoutVans } = LIVE
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/contentStore.test.js`
Expected: FAIL — `store.useVans is not a function`.

- [ ] **Step 3: Implement in `src/lib/contentStore.js`**

Add the import at the top, beside the existing content imports:

```js
import { vans } from '../content/vans.js'
```

Add `vans` to the exported `fallback` object, after the `tours` key:

```js
  vans,
```

Add the hook at the end of the file:

```js
// Falls back per-slice rather than whole-payload: `isWellFormed` deliberately
// does not require `vans`, so an old server answering a new client mid-deploy
// degrades the range only, not the gallery and tours it serves correctly.
export function useVans() {
  const { status, data } = useContent()
  return {
    loading: status === 'loading',
    vans: data?.vans?.items ? data.vans : fallback.vans,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run src/test/contentStore.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contentStore.js src/test/contentStore.test.js
git commit -m "feat(client): read the van range from the live content store"
```

---

### Task 8: Rewire Range, VansPage and VanPage

**Files:**

- Modify: `src/components/Range.jsx`
- Modify: `src/pages/VansPage.jsx`
- Modify: `src/pages/VanPage.jsx`
- Modify: `src/pages/VanPage.css`
- Test: `src/test/components.test.jsx`

**Interfaces:**

- Consumes: `useVans()` from Task 7.
- Produces: nothing later tasks depend on. This is the public-site half of the feature.

- [ ] **Step 1: Write the failing tests**

Append to `src/test/components.test.jsx`. Extend the two existing imports at the
top of the file — `waitFor` is not currently imported and is needed here:

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
```

Add these alongside the other imports:

```js
import { Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { vans as staticVans } from '../content/vans.js'
```

Do **not** add static imports of `VanPage` or `Range`. The store fires its fetch
at module scope, so each test resets the module registry and re-imports — and a
statically-imported component would still be bound to the _old_ store instance,
silently ignoring the stub. Both the store and the component under test must come
from the same post-reset registry:

```js
async function loadWith(response) {
  vi.resetModules()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => response),
  )
  const [{ default: VanPage }, { default: Range }] = await Promise.all([
    import('../pages/VanPage.jsx'),
    import('../components/Range.jsx'),
  ])
  return { VanPage, Range }
}

function renderVanPage(VanPage, slug) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/vans/${slug}`]}>
        <Routes>
          <Route path="/vans/:slug" element={<VanPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

const BARE_VAN = {
  id: 'x',
  slug: 'bare-van',
  name: 'Bare Van',
  length: '',
  tag: '',
  meta: '',
  blurb: '',
  description: [],
  specs: [],
  image: null,
  imageAlt: '',
  floorplan: null,
  floorplanAlt: '',
  photos: [],
  sortOrder: 0,
}

describe('VanPage — live content', () => {
  it('holds a loading state instead of flashing a 404 before content arrives', async () => {
    // A promise that never settles: the store stays in `loading` forever.
    const { VanPage } = await loadWith(new Promise(() => {}))
    renderVanPage(VanPage, 'a-van-created-in-the-dashboard')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument()
  })

  it('renders a 404 once the range is known and the slug is not in it', async () => {
    const { VanPage } = await loadWith(Promise.reject(new Error('offline')))
    renderVanPage(VanPage, 'definitely-not-a-van')

    await waitFor(() => expect(screen.getByText(/page not found/i)).toBeInTheDocument())
  })

  it('renders a van with no image or floorplan without a broken img', async () => {
    const bare = {
      gallery: { interiors: [], exteriors: [], page: [] },
      tours: [],
      vans: { eyebrow: 'e', heading: 'h', sub: 's', items: [BARE_VAN] },
    }
    const { VanPage } = await loadWith(Promise.resolve({ ok: true, json: async () => bare }))
    renderVanPage(VanPage, 'bare-van')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bare Van' })).toBeInTheDocument(),
    )
    // No <img> at all beats an <img src={null}>.
    for (const img of screen.queryAllByRole('img')) {
      expect(img.getAttribute('src')).toBeTruthy()
    }
  })
})

describe('Range — live content', () => {
  it('renders the static range as a fallback when the API is unreachable', async () => {
    const { Range } = await loadWith(Promise.reject(new Error('offline')))
    render(
      <MemoryRouter>
        <Range />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: staticVans.items[0].name })).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/components.test.jsx`
Expected: FAIL — the loading test finds no `role="status"`, because `VanPage` renders `NotFoundPage` immediately.

- [ ] **Step 3: Rewire `src/components/Range.jsx`**

Replace the static import:

```js
import { useVans } from '../lib/contentStore.js'
```

(delete `import { vans } from '../content/vans.js'`)

Inside the component, replace the `items` line:

```js
const { vans } = useVans()
const items = limit ? vans.items.slice(0, limit) : vans.items
```

Change the card key from slug to id — slugs are editable now, and a React key
must be stable:

```js
            <motion.article key={van.id} className="range__card" {...scrollIn(i % 2)}>
```

Guard the image. `.range__image` already carries a background and an inset
hairline, so an empty plate needs no new CSS:

```js
<div className="range__image">
  {van.image && <img src={van.image} alt={van.imageAlt} loading="lazy" />}
</div>
```

- [ ] **Step 4: Rewire `src/pages/VansPage.jsx`**

Replace the static import with `import { useVans } from '../lib/contentStore.js'`,
then read the copy inside the component:

```js
export default function VansPage() {
  const { vans } = useVans()

  return (
```

The rest of the JSX already reads `vans.eyebrow`, `vans.heading` and `vans.sub`,
so it needs no change.

- [ ] **Step 5: Rewire `src/pages/VanPage.jsx`**

Replace the static import with `import { useVans } from '../lib/contentStore.js'`.
Replace the lookup and the 404 guard:

```js
export default function VanPage() {
  const { slug } = useParams()
  const { vans, loading } = useVans()
  const van = vans.items.find((v) => v.slug === slug)

  // A van added in the dashboard is not in the static fallback, so a direct
  // load would flash NotFoundPage for one frame before the fetch lands. Hold
  // until the range is actually known.
  if (!van && loading) {
    return (
      <main className="van">
        <p className="van__loading" role="status">
          Loading…
        </p>
      </main>
    )
  }

  if (!van) return <NotFoundPage />
```

Guard the fields a dashboard-created van starts empty. Replace the SEO block:

```js
<SEO
  title={`${van.length} ${van.name}`.trim()}
  description={van.blurb}
  image={van.image ?? undefined}
  path={`/vans/${van.slug}`}
/>
```

Replace the main image block:

```js
<div className="van__main-image">
  {van.image && <img src={van.image} alt={van.imageAlt} fetchpriority="high" />}
</div>
```

And the description map:

```js
            {(van.description ?? []).map((p) => (
```

- [ ] **Step 6: Add the loading style to `src/pages/VanPage.css`**

Append:

```css
/* Held while the range is in flight, so a dashboard-created van never flashes
 * the 404 page on a direct load. */
.van__loading {
  padding: var(--space-3xl) 0;
  text-align: center;
  color: var(--color-muted);
}
```

Run `grep -n "space-3xl" src/index.css src/config/theme.config.js` first; if that
token does not exist, use `var(--space-2xl)`. Do not invent a token.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `yarn vitest run src/test/components.test.jsx src/test/a11y.test.jsx`
Expected: PASS — including the existing axe checks on Home, which now renders `Range` from the store.

- [ ] **Step 8: Commit**

```bash
git add src/components/Range.jsx src/pages/VansPage.jsx src/pages/VanPage.jsx src/pages/VanPage.css src/test/components.test.jsx
git commit -m "feat(client): van surfaces read live content, no 404 flash"
```

---

### Task 9: Admin API wrappers

**Files:**

- Modify: `src/admin/api.js`

**Interfaces:**

- Produces: `createVan({ name })`, `patchVan(id, patch)`, `reorderVans(ids)`, `deleteVan(id)`, `patchVansPage(patch)`, `uploadVanImage({ id, field, file })`. Tasks 10–13 consume these.

- [ ] **Step 1: Add the wrappers**

Append to `src/admin/api.js`, below the tour wrappers:

```js
export const createVan = (body) => request('/api/vans', asJson(body))
export const patchVan = (id, patch) =>
  request(`/api/vans/${id}`, { ...asJson(patch), method: 'PATCH' })
export const reorderVans = (ids) => request('/api/vans/reorder', asJson({ ids }))
export const deleteVan = (id) => request(`/api/vans/${id}`, { method: 'DELETE' })
export const patchVansPage = (patch) =>
  request('/api/vans/page', { ...asJson(patch), method: 'PATCH' })

export function uploadVanImage({ id, field, file }) {
  const form = new FormData()
  form.append('file', file)
  form.append('field', field)
  return request(`/api/vans/${id}/image`, { method: 'POST', body: form })
}
```

- [ ] **Step 2: Verify nothing broke**

Run: `yarn lint && yarn vitest run src/test/admin.test.jsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/admin/api.js
git commit -m "feat(admin): api wrappers for the van routes"
```

---

### Task 10: Vans list and dashboard navigation

**Files:**

- Create: `src/admin/VansTab.jsx`
- Modify: `src/pages/AdminPage.jsx` (the `NAV` constant, `countFor`, and the panel body)
- Modify: `src/admin/admin.css`
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `createVan`, `reorderVans`, `deleteVan` from Task 9; `useVans` is **not** used here — the dashboard reads `content.vans` from its own `getContent()` call, like every other tab.
- Produces: `<VansTab vans={content.vans} onChange={refresh} />`, rendering the list and delegating one van to `VanEditor` (Task 11).

- [ ] **Step 1: Write the failing tests**

In `src/test/admin.test.jsx`, first extend the shared `EMPTY_CONTENT` fixture:

```js
const EMPTY_CONTENT = {
  gallery: { interiors: [], exteriors: [], page: [] },
  tours: [],
  vans: { eyebrow: '', heading: '', sub: '', items: [] },
}

const VAN = {
  id: 'van-1',
  slug: 'tuff-mudder',
  name: 'Tuff Mudder',
  length: '12ft',
  tag: 'Off-road hybrid',
  meta: 'Sleeps 2',
  blurb: 'Small in size but big in features.',
  description: ['First paragraph.', 'Second paragraph.'],
  specs: ['12ft body', 'Single axle'],
  image: '/images/photo-tuff-mudder.jpg',
  imageAlt: 'Tuff Mudder',
  floorplan: null,
  floorplanAlt: '',
  photos: [],
  sortOrder: 0,
}

const WITH_VAN = {
  ...EMPTY_CONTENT,
  vans: { eyebrow: 'The Range', heading: 'A van for every adventure.', sub: 'Sub.', items: [VAN] },
}
```

Then add the tests:

```js
describe('AdminPage — vans', () => {
  it('lists the range with a count in the rail', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => WITH_VAN },
      }),
    )
    renderAdmin()

    const tab = await screen.findByRole('tab', { name: /vans/i })
    await userEvent.click(tab)

    expect(await screen.findByText('Tuff Mudder')).toBeInTheDocument()
    expect(screen.getByText('/vans/tuff-mudder')).toBeInTheDocument()
  })

  it('adds a van by name', async () => {
    const post = { ok: true, json: async () => ({ van: { ...VAN, id: 'van-2' } }) }
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => WITH_VAN },
        'POST /api/vans': post,
      }),
    )
    renderAdmin()

    await userEvent.click(await screen.findByRole('tab', { name: /vans/i }))
    await userEvent.type(await screen.findByLabelText(/new van name/i), 'Desert Runner')
    await userEvent.click(screen.getByRole('button', { name: /add van/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/vans', expect.anything()))
  })

  it('requires the van name to be typed before deleting', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => WITH_VAN },
        'DELETE /api/vans/van-1': { ok: true, json: async () => ({ ok: true }) },
      }),
    )
    renderAdmin()

    await userEvent.click(await screen.findByRole('tab', { name: /vans/i }))
    await userEvent.click(await screen.findByRole('button', { name: /delete tuff mudder/i }))

    const confirm = screen.getByRole('button', { name: /confirm delete/i })
    expect(confirm).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/type the van name/i), 'Tuff Mudder')
    expect(confirm).toBeEnabled()

    await userEvent.click(confirm)
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/vans/van-1', { method: 'DELETE' }),
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: FAIL — no tab named "Vans" exists.

- [ ] **Step 3: Create `src/admin/VansTab.jsx`**

```jsx
import { useState } from 'react'
import { ArrowUp, ArrowDown, Trash2, Check, X, Plus, Pencil } from 'lucide-react'
import { createVan, reorderVans, deleteVan } from './api.js'
import VanEditor from './VanEditor.jsx'

export default function VansTab({ vans, onChange }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [typed, setTyped] = useState('')
  const [editingId, setEditingId] = useState(null)

  const items = [...vans.items].sort((a, b) => a.sortOrder - b.sortOrder)
  const editing = items.find((v) => v.id === editingId)

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
    await run(() => createVan({ name }))
    setName('')
  }

  function move(index, delta) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    run(() => reorderVans(next.map((v) => v.id)))
  }

  if (editing) {
    return <VanEditor van={editing} onChange={onChange} onBack={() => setEditingId(null)} />
  }

  return (
    <>
      <section className="admin-card">
        <h2 className="admin-card__title">Add a van</h2>
        <form className="admin-form" onSubmit={onAdd}>
          <div className="admin-form__cell">
            <label className="admin-field" htmlFor="new-van-name">
              New van name
            </label>
            <input
              id="new-van-name"
              className="admin-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Desert Runner"
              required
            />
          </div>
          <button className="admin-button" type="submit" disabled={busy}>
            <Plus size={15} aria-hidden="true" />
            Add van
          </button>
        </form>
        <p className="admin-hint">
          The web address is made from the name. Add it here, then fill in the details.
        </p>
        {busy && <p className="admin-status admin-status--live">Working…</p>}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {items.length === 0 ? (
        <p className="admin-empty">No vans yet. Add one above and it appears on /vans.</p>
      ) : (
        <ul className="admin-grid admin-grid--wide">
          {items.map((van, i) => (
            <li key={van.id} className="admin-tile">
              <div className="admin-tile__body">
                <div className="admin-vanrow">
                  <div className="admin-vanrow__thumb">
                    {van.image && <img src={van.image} alt="" />}
                  </div>
                  <div>
                    <span className="admin-tile__ordinal admin-tile__ordinal--inline">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="admin-vanrow__name">{van.name}</p>
                    <p className="admin-vanrow__meta">
                      {[van.length, van.tag].filter(Boolean).join(' · ') || 'No details yet'}
                    </p>
                    <p className="admin-vanrow__url">/vans/{van.slug}</p>
                  </div>
                </div>
              </div>

              <div className="admin-tile__foot">
                {confirming === van.id ? (
                  <div className="admin-confirm admin-confirm--typed">
                    <label className="admin-field" htmlFor={`confirm-${van.id}`}>
                      Type the van name to delete it
                    </label>
                    <input
                      id={`confirm-${van.id}`}
                      className="admin-input"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                    />
                    <div className="admin-confirm__actions">
                      <button
                        type="button"
                        className="admin-icon admin-icon--danger"
                        disabled={typed.trim() !== van.name}
                        onClick={() => {
                          setConfirming(null)
                          setTyped('')
                          run(() => deleteVan(van.id))
                        }}
                      >
                        <Check size={15} aria-hidden="true" />
                        <span className="sr-only">Confirm delete {van.name}</span>
                      </button>
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => {
                          setConfirming(null)
                          setTyped('')
                        }}
                      >
                        <X size={15} aria-hidden="true" />
                        <span className="sr-only">Cancel</span>
                      </button>
                    </div>
                    <p className="admin-hint">
                      Deleting removes /vans/{van.slug} for good, along with its photos.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="admin-tile__order">
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => move(i, -1)}
                        disabled={busy || i === 0}
                        aria-label={`Move ${van.name} earlier`}
                      >
                        <ArrowUp size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => move(i, 1)}
                        disabled={busy || i === items.length - 1}
                        aria-label={`Move ${van.name} later`}
                      >
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="admin-button admin-button--ghost"
                      onClick={() => setEditingId(van.id)}
                    >
                      <Pencil size={15} aria-hidden="true" />
                      Edit {van.name}
                    </button>
                    <button
                      type="button"
                      className="admin-icon admin-icon--danger"
                      onClick={() => setConfirming(van.id)}
                      aria-label={`Delete ${van.name}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
```

- [ ] **Step 4: Wire the nav in `src/pages/AdminPage.jsx`**

Extend the icon import:

```js
import { Images, Sofa, Caravan, Compass, Download, LogOut, Truck, Type } from 'lucide-react'
```

Add a group to `NAV`, after the `Tours` group:

```js
  {
    group: 'Range',
    items: [
      {
        id: 'vans',
        label: 'Vans',
        icon: Truck,
        kind: 'vans',
        where: 'The cards on the home page and /vans.',
      },
      {
        id: 'vans-page',
        label: 'Page intro',
        icon: Type,
        kind: 'vansPage',
        where: 'The heading above the range on /vans.',
      },
    ],
  },
```

Extend `countFor`:

```js
function countFor(view, content) {
  if (!content) return null
  if (view.kind === 'tours') return content.tours.length
  if (view.kind === 'vans') return content.vans.items.length
  if (view.kind === 'vansPage') return null
  return content.gallery[view.id].length
}
```

Extend the topbar's unit label so it does not say "photo" for vans:

```js
{
  count !== null && (
    <p className="admin-topbar__count">
      {count} {view.kind === 'tours' ? 'tour' : view.kind === 'vans' ? 'van' : 'photo'}
      {count === 1 ? '' : 's'}
    </p>
  )
}
```

Add the panel branch after the tours branch:

```jsx
{
  content && view.kind === 'vans' && <VansTab vans={content.vans} onChange={refresh} />
}
```

And the import at the top:

```js
import VansTab from '../admin/VansTab.jsx'
```

(The `vansPage` branch lands in Task 13.)

- [ ] **Step 5: Add the list styles to `src/admin/admin.css`**

Append. Every value is an existing token — check with
`grep -n "space-\|radius-\|color-" src/admin/admin.css | head -20` if unsure.

```css
/* Van list rows: thumbnail beside identity, so the range reads as a range. */
.admin-vanrow {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-md);
  align-items: start;
}

.admin-vanrow__thumb {
  width: 96px;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-alt);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
}

.admin-vanrow__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-vanrow__name {
  margin: 0;
  font-weight: 600;
}

.admin-vanrow__meta,
.admin-vanrow__url {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.85rem;
}

.admin-vanrow__url {
  font-variant-numeric: tabular-nums;
}

/* Deleting a van kills a live URL, so the confirm is a typed name rather than
 * a single click. It needs more room than the icon-pair confirm. */
.admin-confirm--typed {
  display: grid;
  gap: var(--space-xs);
  width: 100%;
}

.admin-confirm__actions {
  display: flex;
  gap: var(--space-xs);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: FAIL on the import of `VanEditor.jsx`, which does not exist yet.

Create the minimal placeholder so this task's tests can pass — Task 11 fills it in:

```jsx
export default function VanEditor({ van, onBack }) {
  return (
    <button type="button" className="admin-backlink" onClick={onBack}>
      Back to all vans — editing {van.name}
    </button>
  )
}
```

Save as `src/admin/VanEditor.jsx`, then re-run.
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/admin/VansTab.jsx src/admin/VanEditor.jsx src/pages/AdminPage.jsx src/admin/admin.css src/test/admin.test.jsx
git commit -m "feat(admin): van list, reorder, add and typed-confirm delete"
```

---

### Task 11: Van editor — identity, copy and specs

**Files:**

- Modify: `src/admin/VanEditor.jsx`
- Modify: `src/admin/admin.css`
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `patchVan` from Task 9; `van` and `onBack` props from Task 10.
- Produces: the editor's text half. Task 12 appends the image half to the same file.

- [ ] **Step 1: Write the failing tests**

Append to the `describe('AdminPage — vans', ...)` block in `src/test/admin.test.jsx`:

```js
async function openEditor(handlers = {}) {
  vi.stubGlobal(
    'fetch',
    mockFetch({
      'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
      'GET /api/content': { ok: true, json: async () => WITH_VAN },
      ...handlers,
    }),
  )
  renderAdmin()
  await userEvent.click(await screen.findByRole('tab', { name: /vans/i }))
  await userEvent.click(await screen.findByRole('button', { name: /edit tuff mudder/i }))
}

it('opens the editor with the van already filled in', async () => {
  await openEditor()

  expect(await screen.findByLabelText(/van name/i)).toHaveValue('Tuff Mudder')
  expect(screen.getByLabelText(/web address/i)).toHaveValue('tuff-mudder')
  expect(screen.getByLabelText(/short blurb/i)).toHaveValue('Small in size but big in features.')
  // Paragraphs round-trip through one textarea, blank-line separated.
  expect(screen.getByLabelText(/full description/i)).toHaveValue(
    'First paragraph.\n\nSecond paragraph.',
  )
})

it('saves a text field on blur', async () => {
  await openEditor({
    'PATCH /api/vans/van-1': { ok: true, json: async () => ({ van: VAN }) },
  })

  const field = await screen.findByLabelText(/van length/i)
  await userEvent.clear(field)
  await userEvent.type(field, '13ft')
  await userEvent.tab()

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/vans/van-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ length: '13ft' }) }),
    ),
  )
})

it('splits the description textarea into paragraphs on save', async () => {
  await openEditor({
    'PATCH /api/vans/van-1': { ok: true, json: async () => ({ van: VAN }) },
  })

  const field = await screen.findByLabelText(/full description/i)
  await userEvent.clear(field)
  await userEvent.type(field, 'One.{Enter}{Enter}Two.')
  await userEvent.tab()

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/vans/van-1',
      expect.objectContaining({ body: JSON.stringify({ description: ['One.', 'Two.'] }) }),
    ),
  )
})

it('adds and removes a spec', async () => {
  await openEditor({
    'PATCH /api/vans/van-1': { ok: true, json: async () => ({ van: VAN }) },
  })

  await userEvent.type(await screen.findByLabelText(/new spec/i), 'Solar ready')
  await userEvent.click(screen.getByRole('button', { name: /add spec/i }))

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/vans/van-1',
      expect.objectContaining({
        body: JSON.stringify({ specs: ['12ft body', 'Single axle', 'Solar ready'] }),
      }),
    ),
  )

  await userEvent.click(screen.getByRole('button', { name: /remove 12ft body/i }))
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/vans/van-1',
      expect.objectContaining({ body: JSON.stringify({ specs: ['Single axle'] }) }),
    ),
  )
})

it('warns that changing the web address breaks the old link', async () => {
  await openEditor()
  expect(await screen.findByText(/breaks the old link/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: FAIL — the placeholder editor has no fields.

- [ ] **Step 3: Replace `src/admin/VanEditor.jsx`**

```jsx
import { useState } from 'react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { patchVan } from './api.js'

// Paragraphs are stored as an array but edited as one textarea — blank lines
// are the separator, which is how the copy reads anyway.
const toText = (paragraphs) => (paragraphs ?? []).join('\n\n')
const toParagraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

const TEXT_FIELDS = [
  { field: 'name', label: 'Van name', hint: null },
  { field: 'slug', label: 'Web address', hint: 'Changing this breaks the old link.' },
  { field: 'length', label: 'Van length', hint: null },
  { field: 'tag', label: 'Category', hint: null },
  { field: 'meta', label: 'Sleeps / axles line', hint: null },
]

export default function VanEditor({ van, onChange, onBack }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [spec, setSpec] = useState('')

  async function save(patch) {
    setBusy(true)
    setError(null)
    try {
      await patchVan(van.id, patch)
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const onBlurField = (field) => (event) => {
    if (event.target.value !== (van[field] ?? '')) save({ [field]: event.target.value })
  }

  return (
    <>
      <button type="button" className="admin-backlink" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" />
        All vans
      </button>

      <p className="admin-editor__url">
        Lives at <strong>/vans/{van.slug}</strong>
      </p>

      {busy && <p className="admin-status admin-status--live">Saving…</p>}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <section className="admin-card">
        <h2 className="admin-card__title">Details</h2>
        {TEXT_FIELDS.map(({ field, label, hint }) => (
          <div className="admin-form__cell" key={field}>
            <label className="admin-field" htmlFor={`van-${field}`}>
              {label}
            </label>
            <input
              id={`van-${field}`}
              className="admin-input"
              defaultValue={van[field] ?? ''}
              onBlur={onBlurField(field)}
            />
            {hint && <p className="admin-hint">{hint}</p>}
          </div>
        ))}
      </section>

      <section className="admin-card">
        <h2 className="admin-card__title">Copy</h2>

        <div className="admin-form__cell">
          <label className="admin-field" htmlFor="van-blurb">
            Short blurb
          </label>
          <input
            id="van-blurb"
            className="admin-input"
            defaultValue={van.blurb ?? ''}
            onBlur={onBlurField('blurb')}
          />
          <p className="admin-hint">One sentence, shown under the van name.</p>
        </div>

        <div className="admin-form__cell">
          <label className="admin-field" htmlFor="van-description">
            Full description
          </label>
          <textarea
            id="van-description"
            className="admin-input admin-textarea"
            rows={8}
            defaultValue={toText(van.description)}
            onBlur={(event) => {
              const next = toParagraphs(event.target.value)
              if (toText(next) !== toText(van.description)) save({ description: next })
            }}
          />
          <p className="admin-hint">Leave a blank line between paragraphs.</p>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card__title">Specs</h2>
        <p className="admin-hint">The short chips under the main photo.</p>

        <ul className="admin-chips">
          {(van.specs ?? []).map((entry) => (
            <li className="admin-chip" key={entry}>
              {entry}
              <button
                type="button"
                className="admin-icon admin-icon--danger"
                aria-label={`Remove ${entry}`}
                onClick={() => save({ specs: van.specs.filter((s) => s !== entry) })}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!spec.trim()) return
            save({ specs: [...(van.specs ?? []), spec.trim()] })
            setSpec('')
          }}
        >
          <div className="admin-form__cell">
            <label className="admin-field" htmlFor="van-new-spec">
              New spec
            </label>
            <input
              id="van-new-spec"
              className="admin-input"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="Solar ready"
            />
          </div>
          <button className="admin-button" type="submit" disabled={busy}>
            <Plus size={15} aria-hidden="true" />
            Add spec
          </button>
        </form>
      </section>
    </>
  )
}
```

- [ ] **Step 4: Add the editor styles to `src/admin/admin.css`**

```css
.admin-backlink {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  background: none;
  border: 0;
  padding: 0;
  color: var(--color-muted);
  cursor: pointer;
}

.admin-backlink:hover {
  color: var(--color-text);
}

.admin-editor__url {
  margin: var(--space-xs) 0 var(--space-md);
  color: var(--color-muted);
}

.admin-textarea {
  resize: vertical;
  min-height: 8rem;
  font: inherit;
  line-height: 1.6;
}

.admin-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  list-style: none;
  margin: 0 0 var(--space-md);
  padding: 0;
}

.admin-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-sm);
  background: var(--color-bg-alt);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
}
```

If `--space-2xs` does not exist, run
`grep -n "space" src/config/theme.config.js` and use the smallest token that
does. Do not invent a token.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/VanEditor.jsx src/admin/admin.css src/test/admin.test.jsx
git commit -m "feat(admin): van editor for details, copy and specs"
```

---

### Task 12: Van editor — hero photo, floorplan and gallery

**Files:**

- Modify: `src/admin/VanEditor.jsx`
- Modify: `src/admin/admin.css`
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `uploadVanImage` from Task 9; `resizeImage` from `src/admin/resizeImage.js`; `PhotosTab` from `src/admin/PhotosTab.jsx`; the `van:<id>` collection from Task 4. The tests below reuse the `openEditor(handlers)` helper and the `VAN` / `WITH_VAN` fixtures defined in Task 11 Step 1 and Task 10 Step 1 of `src/test/admin.test.jsx` — they are already in the file by the time this task runs.
- Produces: the complete editor.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('AdminPage — vans', ...)`:

```js
it('uploads a hero photo and a floorplan through the same endpoint', async () => {
  await openEditor({
    'POST /api/vans/van-1/image': { ok: true, json: async () => ({ van: VAN }) },
  })

  const file = new File(['x'], 'hero.png', { type: 'image/png' })
  await userEvent.upload(await screen.findByLabelText(/replace the main photo/i), file)

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/vans/van-1/image',
      expect.objectContaining({ method: 'POST' }),
    ),
  )
})

it('offers alt text for both images', async () => {
  await openEditor()
  expect(await screen.findByLabelText(/describe the main photo/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/describe the floorplan/i)).toBeInTheDocument()
})

it('renders the van gallery as a photo collection scoped to this van', async () => {
  await openEditor()
  expect(await screen.findByText(/in the flesh/i)).toBeInTheDocument()
  // PhotosTab's own empty state, carrying the label VanEditor passed it.
  expect(screen.getByText(/nothing in tuff mudder photos yet/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: FAIL — no upload input exists.

- [ ] **Step 3: Add the image sections to `src/admin/VanEditor.jsx`**

Extend the imports:

```js
import { useRef, useState } from 'react'
import { ArrowLeft, Plus, X, ImagePlus } from 'lucide-react'
import { patchVan, uploadVanImage } from './api.js'
import { resizeImage } from './resizeImage.js'
import PhotosTab from './PhotosTab.jsx'
```

Add this helper component above `VanEditor` — the hero and the floorplan are the
same widget twice, so it is written once:

```jsx
function SingleImage({ van, field, title, label, altLabel, hint, onUpload, onAlt, busy }) {
  const input = useRef(null)
  const src = van[field]
  const altField = `${field}Alt`

  return (
    <section className="admin-card">
      <h2 className="admin-card__title">{title}</h2>

      <div className="admin-single">
        <div className="admin-single__frame">
          {src ? <img src={src} alt="" /> : <span className="admin-single__empty">No image</span>}
        </div>

        <div className="admin-single__side">
          <label className="admin-field" htmlFor={`van-${field}-file`}>
            {label}
          </label>
          <input
            id={`van-${field}-file`}
            ref={input}
            className="admin-file"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (file) await onUpload(file)
              if (input.current) input.current.value = ''
            }}
          />

          <label className="admin-field" htmlFor={`van-${altField}`}>
            {altLabel}
          </label>
          <input
            id={`van-${altField}`}
            className="admin-input"
            defaultValue={van[altField] ?? ''}
            onBlur={(event) => {
              if (event.target.value !== (van[altField] ?? '')) onAlt(event.target.value)
            }}
          />
          <p className="admin-hint">{hint}</p>
        </div>
      </div>
    </section>
  )
}
```

Inside `VanEditor`, add the upload handler beside `save`:

```js
async function upload(field, original) {
  setBusy(true)
  setError(null)
  try {
    // Resized in the browser first, exactly as the photo tabs do: a 9MB
    // phone photo arrives as roughly 300KB.
    const file = await resizeImage(original)
    await uploadVanImage({ id: van.id, field, file })
    await onChange()
  } catch (err) {
    setError(err.message)
  } finally {
    setBusy(false)
  }
}
```

Then add these three sections after the Specs section, before the closing `</>`:

```jsx
      <SingleImage
        van={van}
        field="image"
        title="Main photo"
        label="Replace the main photo"
        altLabel="Describe the main photo"
        hint="Shown on the range cards and at the top of the van's page."
        busy={busy}
        onUpload={(file) => upload('image', file)}
        onAlt={(value) => save({ imageAlt: value })}
      />

      <SingleImage
        van={van}
        field="floorplan"
        title="Floorplan"
        label="Replace the floorplan"
        altLabel="Describe the floorplan"
        hint="The blueprint drawing beside the description. Leave empty to hide it."
        busy={busy}
        onUpload={(file) => upload('floorplan', file)}
        onAlt={(value) => save({ floorplanAlt: value })}
      />

      <section className="admin-card">
        <h2 className="admin-card__title">In the flesh</h2>
        <p className="admin-hint">The photo grid at the bottom of this van's page.</p>
        <PhotosTab
          key={van.id}
          collection={`van:${van.id}`}
          label={`${van.name} photos`}
          photos={van.photos ?? []}
          onChange={onChange}
        />
      </section>
```

- [ ] **Step 4: Add the single-image styles to `src/admin/admin.css`**

```css
/* The hero and the floorplan are one image each, not a collection — a framed
 * slot beside its fields, rather than the photo grid. */
.admin-single {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: var(--space-md);
  align-items: start;
}

.admin-single__frame {
  display: grid;
  place-items: center;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-alt);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
}

.admin-single__frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-single__empty {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.admin-single__side {
  display: grid;
  gap: var(--space-2xs);
}

@media (max-width: 640px) {
  .admin-single {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: PASS.

- [ ] **Step 6: Confirm `PhotosTab`'s mosaic hint does not leak into van galleries**

`PhotosTab` prints a nine-up mosaic hint ("last row will be short") that is
meaningful for the gallery page and meaningless for a van's photo strip.

Run: `grep -n "blockHint(" src/admin/PhotosTab.jsx`
Expected: `{collection === 'page' && <p className="admin-hint">{blockHint(items.length)}</p>}`

It is **already** scoped to the `page` collection, so a van gallery never shows
it and **no change is needed**. Do not widen this condition — rewriting it as a
`!collection.startsWith('van:')` check would start showing the mosaic hint on the
interiors and exteriors collections, where it is equally wrong.

- [ ] **Step 7: Commit**

```bash
git add src/admin/VanEditor.jsx src/admin/PhotosTab.jsx src/admin/admin.css src/test/admin.test.jsx
git commit -m "feat(admin): van hero, floorplan and gallery management"
```

---

### Task 13: Page intro tab, docs and the full gate

**Files:**

- Create: `src/admin/VansPageTab.jsx`
- Modify: `src/pages/AdminPage.jsx`
- Modify: `README.md`
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `patchVansPage` from Task 9.
- Produces: the finished feature.

- [ ] **Step 1: Write the failing test**

Append inside `describe('AdminPage — vans', ...)`:

```js
it('edits the /vans page intro copy', async () => {
  vi.stubGlobal(
    'fetch',
    mockFetch({
      'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
      'GET /api/content': { ok: true, json: async () => WITH_VAN },
      'PATCH /api/vans/page': { ok: true, json: async () => ({ page: {} }) },
    }),
  )
  renderAdmin()

  await userEvent.click(await screen.findByRole('tab', { name: /page intro/i }))

  const heading = await screen.findByLabelText(/heading/i)
  expect(heading).toHaveValue('A van for every adventure.')

  await userEvent.clear(heading)
  await userEvent.type(heading, 'Every adventure, covered.')
  await userEvent.tab()

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/vans/page',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ heading: 'Every adventure, covered.' }),
      }),
    ),
  )
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: FAIL — no tab named "Page intro" renders a panel.

- [ ] **Step 3: Create `src/admin/VansPageTab.jsx`**

```jsx
import { useState } from 'react'
import { patchVansPage } from './api.js'

const FIELDS = [
  { field: 'eyebrow', label: 'Eyebrow', hint: 'The small line above the heading.' },
  { field: 'heading', label: 'Heading', hint: 'The big line at the top of /vans.' },
  { field: 'sub', label: 'Intro paragraph', hint: 'One or two sentences under the heading.' },
]

export default function VansPageTab({ page, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function save(patch) {
    setBusy(true)
    setError(null)
    try {
      await patchVansPage(patch)
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card">
      <h2 className="admin-card__title">Range intro</h2>
      <p className="admin-hint">
        This copy sits above the van cards on /vans and on the home page.
      </p>

      {FIELDS.map(({ field, label, hint }) => (
        <div className="admin-form__cell" key={field}>
          <label className="admin-field" htmlFor={`page-${field}`}>
            {label}
          </label>
          <input
            id={`page-${field}`}
            className="admin-input"
            defaultValue={page[field] ?? ''}
            onBlur={(event) => {
              if (event.target.value !== (page[field] ?? '')) save({ [field]: event.target.value })
            }}
          />
          <p className="admin-hint">{hint}</p>
        </div>
      ))}

      {busy && <p className="admin-status admin-status--live">Saving…</p>}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Wire the panel in `src/pages/AdminPage.jsx`**

Add the import and the branch after the `vans` branch:

```js
import VansPageTab from '../admin/VansPageTab.jsx'
```

```jsx
{
  content && view.kind === 'vansPage' && <VansPageTab page={content.vans} onChange={refresh} />
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: PASS.

- [ ] **Step 6: Document it in `README.md`**

In the "Admin dashboard" section, replace the opening sentence:

```markdown
Ausflex staff manage gallery photos, 360° tours and the whole van range at **`/admin`**,
publishing to the live site with no redeploy.
```

And add after the paragraph about `content.json`:

```markdown
**The van range.** Every van on `/vans` is editable: its name, web address, length,
category, blurb, description paragraphs and spec chips, plus its main photo, its floorplan
blueprint and its photo gallery. Vans can be added, reordered and deleted. Deleting one
removes `/vans/<slug>` for good — including whatever search ranking that page had — so it
asks for the van's name to be typed first. Changing a van's web address has the same effect
on the old URL, with a warning rather than a gate.
```

- [ ] **Step 7: Run the full gate**

```bash
yarn lint && yarn format:check && yarn test && yarn build
```

Expected: all four pass. If `format:check` fails, run `yarn format` and re-run.

- [ ] **Step 8: Verify by hand against a real server**

```bash
yarn dev:api    # terminal 1
yarn dev        # terminal 2
```

Then, at `http://localhost:5173/admin`:

1. Sign in.
2. **Range → Vans**: add "Test Van", confirm it appears at `/vans` with an empty
   image plate and no broken image icon.
3. Open `/vans/test-van` directly in a new tab — it must show the loading state
   and then the van, never a flash of the 404 page.
4. Edit it: name, web address, length, blurb, two description paragraphs, two specs.
   Reload `/vans/test-van` and confirm every one of them rendered.
5. Upload a main photo and a floorplan. Confirm both appear, and that the floorplan
   shows beside the description.
6. Add two gallery photos, reorder them, confirm the order on the public page.
7. **Range → Page intro**: change the heading; confirm it updates on `/vans` and on the
   home page range band.
8. Delete "Test Van" — the confirm must stay disabled until the name is typed exactly.
   Confirm `/vans/test-van` then 404s and that the other vans are untouched.
9. **Download backup** from the sidebar; confirm the JSON contains the `vans` key.

- [ ] **Step 9: Commit**

```bash
git add src/admin/VansPageTab.jsx src/pages/AdminPage.jsx README.md src/test/admin.test.jsx
git commit -m "feat(admin): edit the /vans intro copy; document van management"
```
