# Admin Dashboard — Design

**Date:** 2026-08-22
**Status:** Approved, pending implementation plan
**Scope:** A hosted admin dashboard letting Ausflex staff manage gallery photos and 360° tour embeds, publishing live without a redeploy.

---

## 1. Problem

The site is a static SPA. Gallery photos and the 360° tour URL are baked into
`src/content/gallery.js` and `src/content/tour.js` at build time, and photo files
live in `public/images/`. Any content change requires Billy to edit code and
redeploy. Ausflex staff need to add and remove photos and tours themselves, and
see the result on the live site immediately.

## 2. Decisions taken

| Decision            | Choice                                        | Rationale                                                                           |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Operator            | Ausflex staff, publishing instantly           | Client self-serve is the point; a redeploy gate defeats it                          |
| Backend             | Node/Express + Railway volume                 | Chosen over Supabase and a headless CMS: one vendor, one bill, no third party       |
| Metadata store      | `content.json` on the volume                  | Two content types, one editor at a time — no concurrency to lose, no second service |
| Image resizing      | In the browser, before upload                 | No native module (Yarn PnP + Nixpacks risk); a 9MB phone photo uploads as ~300KB    |
| Auth                | Single shared login                           | Client preference; named accounts remain a later config change                      |
| Alt text            | Optional                                      | Missing alt renders `alt=""` (valid decorative markup), so a11y scores hold         |
| Managed collections | All three: interiors, exteriors, gallery page | —                                                                                   |
| 360 tours           | Multiple, listed                              | `/360` becomes a picker; home band shows the first                                  |

### Accepted trade-offs

- **No audit trail.** A shared login means no record of who changed what, and
  revoking one person's access means rotating the password for everyone.
- **The volume is a single point of failure.** Railway volumes are not
  automatically backed up and will hold the client's photo library.
- **Single replica.** A mounted volume prevents horizontal scaling. Irrelevant at
  this traffic level, but it is a door that closes.

## 3. Architecture

### 3.1 Server

`server/index.js` replaces `vite preview` as the production process. The change
goes in **`package.json`'s `start` script**, which becomes
`yarn node server/index.js` — not in `railway.json`. Both `railway.json` and
`lighthouserc.json` invoke `yarn start`, so changing the script updates both and
keeps them from drifting apart. The `yarn node` prefix is required because this
repo runs Yarn PnP and bare `node` will not resolve dependencies.

Express takes over the jobs the Vite preview server was doing implicitly:

- serving `dist/`
- SPA history fallback (any non-`/api`, non-`/uploads` path returns `index.html`)
- the four security headers currently declared in `vite.config.js`
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`), ported verbatim

It defaults to port 4173 and logs a line containing `localhost:4173`, matching the
existing `startServerReadyPattern` in `lighthouserc.json`.

**Dependencies added:** `express`, `multer`, `cookie-parser`. Nothing native —
password hashing uses `node:crypto` `scrypt` rather than bcrypt, and session
cookies are HMAC-signed rather than pulling in `jsonwebtoken`.

### 3.2 Storage layout

A Railway volume mounts at `/data`:

```
/data/content.json          metadata for photos and tours
/data/uploads/<uuid>.webp   uploaded images
```

`DATA_DIR` overrides the mount point and defaults to `./.data` locally, so
development needs no Railway. `.data` is added to `.gitignore`.

### 3.2.1 Development workflow

`yarn dev` still runs Vite on 5173, but `/api` and `/uploads` now have to reach
the Express server. `vite.config.js` gains a `server.proxy` entry forwarding both
prefixes to `http://localhost:3001`, and a new `yarn dev:api` script runs the
server on that port with `DATA_DIR=./.data`. Two terminals, no new dependency —
`concurrently` is not worth a dependency for this.

The `preview` block in `vite.config.js` is **removed**. Once `yarn start` runs
Express, nothing in the pipeline uses it — and leaving a `preview` server that
serves a different stack to production, with its own divergent copy of the
security headers, is a footgun. The headers live in the server only. `yarn preview`
survives as a bare Vite command for quick static checks, but is no longer part of
any pipeline and no longer carries the Railway `allowedHosts` entry.

### 3.3 The store — `server/store.js`

Loads `content.json` into memory at boot; reads are served from memory.

**Atomic writes.** Serialise to `content.json.tmp`, then `rename()` into place.
Atomic on a single filesystem, so a crash mid-write cannot leave a truncated
file. Every write passes through a single promise queue so overlapping requests
cannot interleave.

**Seed on first boot.** If `content.json` is absent, the server builds it by
importing `src/content/gallery.js` and `src/content/tour.js` directly — they are
plain ESM data and Node reads them as-is. Seeded photo rows point at
`/images/<file>.jpg`, which `dist/` already serves, so no bytes are copied and the
dashboard opens populated with the real library.

Staging and production have separate volumes and therefore separate content, each
self-seeding on first boot. The client edits production.

### 3.4 Data shape

```jsonc
{
  "version": 1,
  "photos": [
    {
      "id": "uuid",
      "collection": "interiors" | "exteriors" | "page",
      "src": "/images/interior-galley.jpg" | "/uploads/<uuid>.webp",
      "alt": "",
      "caption": "",
      "sortOrder": 0,
      "createdAt": "ISO-8601"
    }
  ],
  "tours": [
    {
      "id": "uuid",
      "title": "",
      "embedUrl": "https://kuula.co/share/collection/...",
      "poster": "/images/interior-galley.jpg" | "/uploads/<uuid>.webp" | null,
      "sortOrder": 0,
      "createdAt": "ISO-8601"
    }
  ]
}
```

`src` deliberately holds either a build-served path or an upload path. This is what
makes seeding free: existing photos keep their current URL, new ones get an upload
URL, and consumers do not care which.

## 4. API

All mutating routes require a valid session cookie and return 401 without one.

| Method | Route                 | Auth   | Purpose                                                       |
| ------ | --------------------- | ------ | ------------------------------------------------------------- |
| GET    | `/api/content`        | public | Both collections, one payload, ETag + `max-age=60`            |
| POST   | `/api/auth/login`     | public | Password → session cookie                                     |
| GET    | `/api/auth/session`   | public | `{ authed: boolean }`                                         |
| POST   | `/api/auth/logout`    | auth   | Clears the cookie                                             |
| POST   | `/api/photos`         | auth   | Multipart upload → new row                                    |
| PATCH  | `/api/photos/:id`     | auth   | `alt`, `caption`, `collection`                                |
| POST   | `/api/photos/reorder` | auth   | Ordered array of ids for one collection                       |
| DELETE | `/api/photos/:id`     | auth   | Removes row; unlinks the file only if it is under `/uploads/` |
| POST   | `/api/tours`          | auth   | New tour                                                      |
| PATCH  | `/api/tours/:id`      | auth   | `title`, `embedUrl`, `poster`                                 |
| POST   | `/api/tours/reorder`  | auth   | Ordered array of ids                                          |
| DELETE | `/api/tours/:id`      | auth   | Removes row                                                   |
| GET    | `/api/admin/export`   | auth   | Downloads `content.json` as a backup                          |

Deleting a seeded row (`src` under `/images/`) removes the row only; the file stays
in the build, harmlessly.

### 4.1 Upload validation

- MIME must be an image type; extension is derived from the sniffed type, never
  from the client-supplied filename.
- 8MB hard cap at the server (the browser normally sends ~300KB after resizing).
- Filenames are server-generated UUIDs. Client-supplied names are never used in a
  path.

### 4.2 Embed URL validation

`embedUrl` must be `https:` and its host must be in an allowlist
(`kuula.co`, `matterport.com` and subdomains). The value lands in an
`<iframe src>`, so an unvalidated URL is a script-injection surface. Only an
authenticated user can set it, but the check costs five lines.

## 5. Auth

| Env var               | Purpose                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `ADMIN_PASSWORD_HASH` | scrypt hash with embedded salt, generated by `scripts/hash-password.mjs` |
| `SESSION_SECRET`      | HMAC key for signing the session cookie                                  |

Login compares with `crypto.timingSafeEqual` and sets an HttpOnly, Secure,
SameSite=Strict, signed cookie with a 7-day expiry.

**Rate limiting.** In-memory, 10 attempts per IP per 15 minutes, then 429. With a
single shared password this limiter is the only barrier between the internet and
write access, so it is load-bearing.

The server boots cleanly when `ADMIN_PASSWORD_HASH` is unset — logins simply
always fail — so CI and Lighthouse need no secrets.

## 6. Public read path

`src/lib/contentStore.js` fires `fetch('/api/content')` at **module scope**, not
inside a `useEffect`, so the request is in flight while React is still mounting
rather than waterfalled behind it. Same-origin: no SDK, no API key, no CORS
preflight.

**Rendering.** Tiles show a fixed-aspect skeleton until data lands, then paint
once. The static content files are _not_ rendered first and swapped — photos
visibly rearranging a beat after load looks broken exactly when the client is
checking their own edit. Fixed aspect ratios mean the skeleton produces no layout
shift.

**Fallback.** If `/api/content` fails or returns malformed data, components fall
back to the imported static content. The site never renders an empty gallery, and
`src/test/content.test.js` keeps passing untouched.

**Caching.** `/uploads/*` is served with `immutable, max-age=31536000` — safe
because filenames are content-unique UUIDs, so an edited photo is a new URL and
never a stale cache.

Lighthouse gates `/` only, where LCP is the hero image and the interiors rail sits
far below the fold, so the runtime fetch is off the measured critical path.

## 7. Admin UI

`/admin` — lazy-loaded, rendered outside the Navbar/Footer chrome via a layout
split in `App.jsx`, `noindex`, excluded from `sitemap.xml`, disallowed in
`robots.txt`.

**Login screen.** Single password field, error state, rate-limit message.

**Photos tab.** Collection switcher (Interiors rail · Exteriors · Gallery page), a
drop zone, and one row per photo: thumbnail, alt field, caption field, up/down,
delete. Fields save on blur with an inline confirmation.

Because the `/gallery` mosaic tiles in blocks of nine (see `GalleryGrid.css`), the
tab shows a live count hint — _"36 photos · 4 full blocks ✓"_ versus _"38 photos ·
last row will be short"_. Cheapest available guard against the client quietly
breaking that layout.

**360 Tours tab.** One row per tour: title, embed URL, poster, up/down, delete,
plus an add form. The first tour by order is the one the home band shows, labelled
as such in the UI so it is not a hidden rule.

Deletes use an in-app confirm, never `window.confirm`. Styling uses only existing
theme tokens — no new tokens, no raw hex, per `CLAUDE.md`.

### 7.1 Browser-side resize

Before upload: `createImageBitmap(file)` → canvas at max 2000px on the long edge →
`canvas.toBlob('image/webp', 0.82)`, falling back to `image/jpeg` if WebP encoding
returns null. The UI shows original versus compressed size.

## 8. Public component changes

- **`VirtualTour`** accepts an optional tours array. `/360` becomes a picker with
  exactly **one** iframe mounted at a time; mounting several Kuula players at once
  would be punishing. The home band keeps its launch-poster behaviour and renders
  the first tour.
- **`GalleryGrid`** and **`InteriorsRail`** take items from the content store and
  gain a skeleton state. Their `{ eyebrow, heading, sub, items }` prop shape is
  unchanged.
- **`gallery.exteriors` is currently orphaned** — defined but rendered nowhere. It
  becomes a band on `/gallery` above the mosaic, leaving the home page's tuned
  rhythm alone.

Section headings (`eyebrow`, `heading`, `sub`) stay in the static content files.
They are copywriting, not inventory, and are out of scope for this dashboard.

## 9. Testing

**Server (Vitest + supertest)**

- Store: atomic write, seed-on-first-boot, write-queue serialisation, malformed
  file recovery.
- Auth: hash comparison, cookie signing and rejection of a forged cookie, rate
  limiter.
- Authorisation: an unauthenticated `DELETE /api/photos/:id` returns 401 and
  leaves the store untouched. This is the one property worth proving rather than
  assuming.
- Upload validation: non-image rejected, oversize rejected, path traversal in the
  supplied filename cannot escape the uploads directory.
- Embed URL validator: `javascript:` and off-allowlist hosts rejected.

**Client**

- `contentStore` falls back to static content when fetch rejects or returns
  malformed data.
- Row → component-shape mapper.
- jest-axe on the login and dashboard screens.

Existing suites must stay green untouched.

## 10. CI and deployment

- `lighthouserc.json` needs no change: the server defaults to 4173 and logs the
  expected ready pattern. It requires `dist/` to exist, which the CI build step
  already produces, and a writable `DATA_DIR`.
- New env vars go into `.env.example` and both Railway environments.
- A Railway volume must be created and mounted at `/data` on each environment
  before first deploy. **This is a manual Railway step and a prerequisite** — the
  server will otherwise write to ephemeral container disk and silently lose
  content on redeploy.
- Staging keeps `VITE_NOINDEX=true` per `docs/ENVIRONMENTS.md`.

## 11. Out of scope

- Named per-user accounts and audit logging.
- Editing section headings, van records, or any other content file.
- Automated volume backup beyond the `content.json` export button. Images require
  manual recovery; Ausflex should keep their originals.
- Image `srcset` / multiple derived sizes.
