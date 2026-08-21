# Admin Van Editing — Design

**Date:** 2026-08-22
**Status:** Approved, pending implementation plan
**Scope:** Extend the admin dashboard so Ausflex staff can manage the van range —
each product's details and copy, its hero photo, its floorplan blueprint, its
photo gallery, and the `/vans` page intro — publishing live without a redeploy.

Builds directly on [2026-08-22-admin-dashboard-design.md](./2026-08-22-admin-dashboard-design.md).
Every convention established there (single shared login, `content.json` on the
Railway volume, browser-side resize before upload, no audit trail) carries over
unchanged and is not restated here.

---

## 1. Problem

The dashboard manages photos and 360° tours, but the van range — the actual
product catalogue — is still baked into `src/content/vans.js` at build time. It
drives three surfaces:

| Surface       | Component                  | Reads                                      |
| ------------- | -------------------------- | ------------------------------------------ |
| Home page     | `src/components/Range.jsx` | `vans.eyebrow/heading/sub`, `vans.items`   |
| `/vans`       | `src/pages/VansPage.jsx`   | `vans.eyebrow/heading/sub`, then `Range`   |
| `/vans/:slug` | `src/pages/VanPage.jsx`    | one item in full, incl. floorplan + photos |

So a price-list refresh, a new model, a corrected length, or a re-drawn
floorplan all require Billy to edit code and redeploy. The client cannot touch
the thing the site actually sells.

## 2. Decisions taken

| Decision         | Choice                                         | Rationale                                                                                             |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Storage          | Extend the existing `content.json`             | Keeps one `/api/content` payload, one cache, one `Download backup`. A second store splits all three   |
| Van list control | Full CRUD — add, edit, reorder, delete         | Client's choice; the range grows and shrinks without a developer                                      |
| Images           | Upload, reusing the photo pipeline             | A new blueprint is the exact case that must not need a developer                                      |
| Text scope       | Van copy + the `/vans` page intro              | Stays inside this feature's boundary; site-wide copy is a later phase                                 |
| Gallery photos   | Rows in the existing `photos` array            | Inherits upload, resize, reorder, alt/caption and delete-with-file-cleanup already written and tested |
| Hero + floorplan | Singular fields, one dedicated upload endpoint | They are single images, not collections; modelling them as collections would be a lie                 |
| Description copy | One textarea, split on blank lines             | Trades a little precision for much less UI than a paragraph-row editor                                |
| Slug on create   | Auto-derived from the name, then editable      | Staff should never have to think about URLs, but must be able to fix one                              |

### Accepted trade-offs

- **The dashboard can now break a live URL.** Deleting a van, or editing its
  slug, makes `/vans/<old-slug>` a 404 and discards whatever search ranking that
  page had. There is no redirect table. Delete is gated behind typing the van's
  name; a slug edit is gated behind a warning only.
- **No draft state.** Every save is live immediately, consistent with photos and
  tours. A half-written van is a half-written van on the public site.
- **Description paragraphs lose blank-line nuance.** Splitting on blank lines
  means the editor cannot express an intentionally empty paragraph. It cannot
  express one today either, so nothing is lost.

## 3. Data model

### 3.1 Shape

`content.json` gains one top-level key, mirroring the shape
`src/content/vans.js` already exports so that seeding and client fallback are
both verbatim copies rather than translations:

```jsonc
{
  "version": 1,
  "photos": [
    /* unchanged */
  ],
  "tours": [
    /* unchanged */
  ],
  "vans": {
    "eyebrow": "The Range",
    "heading": "A van for every adventure.",
    "sub": "Single axle or dual, …",
    "items": [
      {
        "id": "9f2c…", // uuid, server-assigned, never edited
        "slug": "tuff-mudder", // unique, URL segment
        "name": "Tuff Mudder",
        "length": "12ft",
        "tag": "Off-road hybrid",
        "meta": "Sleeps 2 · Single axle",
        "blurb": "Small in size but big in features…",
        "description": ["para one", "para two"],
        "specs": ["12ft body", "Single axle"],
        "image": "/images/photo-tuff-mudder.jpg",
        "imageAlt": "Ausflex 12ft Tuff Mudder…",
        "floorplan": "/images/plan-tuff-mudder.jpg",
        "floorplanAlt": "Floor plan of the 12ft Tuff Mudder",
        "sortOrder": 0,
        "createdAt": "2026-08-22T…",
      },
    ],
  },
}
```

`photos` is **not** in the stored van record. A van's gallery photos live in the
top-level `photos` array with `collection: "van:<id>"`, and `/api/content`
attaches them to the van on read (§5.1).

### 3.2 Seeding

`server/seed.js` imports `vans` from `src/content/vans.js` and copies it,
assigning each item an `id`, a `sortOrder` from its index, and a `createdAt`.
Each item's static `photos[]` becomes `van:<id>` rows in the `photos` array,
exactly as gallery items already do — pointing at `/images/*`, which `dist/`
serves, so seeding still copies no bytes.

### 3.3 Migration of existing content.json

This is the one genuinely hazardous part. `store.js`'s `load()` currently
accepts any file with array `photos` and `tours`. **A content.json already
deployed to Railway has no `vans` key and would pass that check**, leaving
`content.vans` undefined and every van surface empty.

`load()` therefore gains a forward-migration after the parse succeeds: if
`parsed.vans` is missing or malformed, backfill it from `buildSeed().vans` (and
its `van:*` photo rows) and persist. Rebuilding the whole file from seed is not
an acceptable fallback here — it would orphan every photo the client has already
uploaded.

## 4. Server API

All routes require auth (`requireAuth`), matching photos and tours. Literal
segments register **before** `/:id`, the pattern `tours.js` already uses for
`/reorder`.

| Method | Path                  | Body                                       | Notes                                           |
| ------ | --------------------- | ------------------------------------------ | ----------------------------------------------- |
| PATCH  | `/api/vans/page`      | `{ eyebrow?, heading?, sub? }`             | The `/vans` intro and home range head           |
| POST   | `/api/vans`           | `{ name }`                                 | Slug auto-derived; all other fields start empty |
| POST   | `/api/vans/reorder`   | `{ ids: [] }`                              | Mirrors `/api/photos/reorder`                   |
| PATCH  | `/api/vans/:id`       | any subset of the editable fields          | See validation below                            |
| POST   | `/api/vans/:id/image` | multipart `file`, `field=image\|floorplan` | Replaces that single image                      |
| DELETE | `/api/vans/:id`       | —                                          | Cascades to its photos and their files          |

### 4.1 Validation

Added to `server/validate.js` alongside `isValidEmbedUrl`:

- `isValidSlug(value)` — `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, 1–60 chars. Uniqueness
  is checked in the route against the other vans (400 on collision).
- `slugify(name)` — lowercase, non-alphanumerics to `-`, collapse and trim
  runs, truncate to 60. On collision at create time, append `-2`, `-3`, …
- Field caps, rejected with 400: `name` ≤ 80, `length`/`tag`/`meta` ≤ 60,
  `blurb` ≤ 400, `imageAlt`/`floorplanAlt` ≤ 200, `description` ≤ 20 entries of
  ≤ 2000 chars, `specs` ≤ 12 entries of ≤ 60 chars. These are guardrails against
  a paste accident, not a security boundary — `express.json`'s 256kb limit is
  that.
- `description` and `specs` must be arrays of strings; empty strings are
  filtered out server-side rather than rejected.

`POST /api/vans` requires a non-empty `name` and nothing else, so a new van can
be filled in over several saves.

### 4.2 Image upload

`POST /api/vans/:id/image` reuses `multer` memory storage, `MAX_UPLOAD_BYTES`
and `extForMime` verbatim from `photos.js` — same webp/jpeg/png allowlist, same
server-generated UUID filename, same refusal of the client's filename. `field`
must be `image` or `floorplan`; anything else is a 400.

After the write it sets `van[field]` and `van[field + 'Alt']` is left alone (alt
text is edited as a normal text field). If the **previous** value started with
`/uploads/`, that file is unlinked — seeded `/images/*` paths are part of the
build and must survive.

### 4.3 Van gallery photos reuse `/api/photos`

`photos.js` currently gates on a fixed `COLLECTIONS` array. That becomes a
predicate:

```js
const isValidCollection = (value) =>
  COLLECTIONS.includes(value) ||
  (typeof value === 'string' &&
    value.startsWith('van:') &&
    read().vans.items.some((v) => `van:${v.id}` === value))
```

Every existing photo route then works unchanged for a van's gallery: upload with
resize, edit alt and caption, reorder, and delete with file cleanup. This is the
single largest saving in the design — no new upload, reorder or delete code, and
the existing `photos.routes.test.js` coverage applies.

### 4.4 Delete cascade

`DELETE /api/vans/:id` removes the van, removes every `collection: "van:<id>"`
photo row, and unlinks each of those files that lives under `/uploads/`. Its
hero image and floorplan are unlinked on the same rule. All of it happens inside
one `mutate()` so a crash cannot half-apply it.

## 5. Reading it back

### 5.1 `/api/content`

`server/routes/content.js` gains a `vans` slice. Each van is returned with its
gallery photos attached, so the client sees one coherent object and never has to
join two arrays:

```js
vans: {
  eyebrow, heading, sub,
  items: [...content.vans.items]
    .sort(byOrder)
    .map((van) => ({ ...van, photos: of(`van:${van.id}`) })),
}
```

The three named collections keep their existing keys, so `gallery.interiors`
etc. are untouched. ETag and the 60s `Cache-Control` are unchanged and now cover
vans too.

### 5.2 `src/lib/contentStore.js`

`fallback` gains `vans` — imported straight from `src/content/vans.js`, so the
static file remains the ground truth when the API is unreachable.

A new `useVans()` hook falls back **per-slice** rather than whole-payload:

```js
export function useVans() {
  const { status, data } = useContent()
  return {
    loading: status === 'loading',
    vans: data?.vans?.items ? data.vans : fallback.vans,
  }
}
```

`isWellFormed` is deliberately **not** extended to require `vans`. During a
rolling deploy an old server can briefly answer a new client; requiring `vans`
there would drop the whole payload — gallery and tours included — to fallback.
Degrading only the van slice is strictly better.

### 5.3 Component rewiring

- **`Range.jsx`** takes `vans` from `useVans()` instead of the static import.
  Its `key={van.slug}` becomes `key={van.id}` — slugs are now editable and a
  key must be stable.
- **`VansPage.jsx`** reads the intro text from `useVans()`.
- **`VanPage.jsx`** reads the item from `useVans()`.

**The 404 flash.** `VanPage` currently does `if (!van) return <NotFoundPage />`.
Once the list arrives over the network, a direct load of `/vans/tuff-mudder`
would render a 404 for one frame before the data lands. It must hold a neutral
loading state while `loading` is true and only fall through to `NotFoundPage`
once the list is actually known. This is a real regression if missed and gets
its own test.

**Empty fields.** A van created in the dashboard starts with no images and no
copy. `Range` and `VanPage` must render a neutral placeholder block where
`image` is null rather than an `<img src={null}>`, and `description` /
`specs` / `photos` all need `?? []` guards. `VanPage`'s SEO `image` prop is
omitted when null so the page falls back to the site default OG image.

## 6. Dashboard UI

`src/pages/AdminPage.jsx`'s `NAV` gains a group:

```
Range
  ├── Vans        (Caravan icon)   — "Cards on the home page and /vans."
  └── Page intro  (Type icon)      — "The heading above the range."
```

The existing `countFor` helper extends to return `content.vans.items.length`.

### 6.1 `VansTab.jsx`

Two states in one component, mirroring how `PhotosTab` and `ToursTab` sit
inside the panel:

**List** — ordered cards, each showing thumbnail, name, length, tag, photo
count and its live URL. Per card: up/down reorder, **Edit**, and delete. An
`Add a van` form at the top takes just a name, matching `ToursTab`'s add form.

**Editor** — drilled into from a card, with a back link. Sections:

1. _Identity_ — name, slug (with a warning that changing it breaks the old
   URL), length, tag, meta.
2. _Copy_ — blurb (short input) and description (textarea, blank-line
   separated, with a hint saying so).
3. _Specs_ — the chip list under the hero image. Add/remove rows.
4. _Hero photo_ — current image, alt text field, replace-by-upload.
5. _Floorplan_ — same, plus a note that it is the blueprint on the detail page.
6. _Gallery_ — the "In the flesh" grid, rendered by **reusing `PhotosTab`**
   with the van's own `van:<id>` collection. This is why §4.3 matters: the
   whole section is one line of JSX.

Text fields save on blur when changed, the pattern `ToursTab` already uses.
Deleting requires typing the van's name — a heavier gate than the photo and
tour trash buttons, because the consequence is a dead URL rather than a missing
image.

### 6.2 Styling

`src/admin/admin.css` gains only what the editor genuinely needs: a back link,
a section divider, a single-image drop target, and the spec chip rows.
Everything else reuses `admin-card`, `admin-form`, `admin-input`, `admin-tile`,
`admin-grid`, `admin-icon`, `admin-confirm`.

## 7. Testing

| File                               | Adds                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `server/vans.routes.test.js` (new) | CRUD happy paths; auth required; slug validation, collision and auto-derivation; field caps; `field` param; delete cascade removes photo rows and unlinks files; reorder |
| `server/store.test.js`             | A content.json with `photos`/`tours` but no `vans` is migrated, **not** rebuilt — existing photos survive                                                                |
| `server/api.test.js`               | `/api/content` returns vans sorted, with gallery photos attached                                                                                                         |
| `server/photos.routes.test.js`     | `van:<id>` is accepted for a real van, rejected for an unknown one                                                                                                       |
| `src/test/contentStore.test.js`    | `useVans` returns the static fallback when the payload omits `vans`, while gallery still comes from the API                                                              |
| `src/test/admin.test.jsx`          | Vans list renders, add form posts, editor saves on blur, delete requires the typed name                                                                                  |
| `src/test/components.test.jsx`     | `VanPage` shows a loading state — not a 404 — before content arrives; a van with no image renders a placeholder rather than a broken `<img>`                             |
| `src/test/content.test.js`         | `vans` shape contract: items have slug, name, and array `description`/`specs`                                                                                            |

TDD throughout, per the repo's workflow: each route and each component change
gets its failing test first.

## 8. Out of scope

- Site-wide copy editing (home, about, FAQ, why, dealer, contact, legal).
  That is a separate CMS-shaped feature and needs its own spec.
- Redirects for changed or deleted slugs.
- Draft/publish states, scheduling, or per-van visibility.
- Pricing, availability, or anything transactional — the template's scope is
  landing pages, not commerce.
