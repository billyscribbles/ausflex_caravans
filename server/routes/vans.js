import { Router } from 'express'
import { randomUUID } from 'node:crypto'
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
import { requireAuth } from './auth.js'

const TEXT_FIELDS = ['slug', 'name', 'length', 'tag', 'meta', 'blurb', 'imageAlt', 'floorplanAlt']
const LIST_FIELDS = ['description', 'specs']
const PAGE_FIELDS = ['eyebrow', 'heading', 'sub']
const IMAGE_FIELDS = ['image', 'floorplan']

// Same settings as photos.js: the browser has already resized, and memory
// storage lets us validate the type before anything touches disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } })

const router = Router()
router.use(requireAuth)

const findVan = (id) => read().vans.items.find((v) => v.id === id)

// Signals a slug collision from inside a mutate() callback, before any field
// is written, so a losing request never persists a partial edit.
class SlugTakenError extends Error {}

// Signals that the van a request is operating on was deleted by a concurrent
// request between our pre-check and the mutate() callback running. Thrown
// before any field is written, so the losing request never touches a
// vanished record — see the module-level check in each of the two routes
// below for why this matters here specifically.
class VanGoneError extends Error {}

// Seeded rows point at /images/*, which ships with the build and must stay.
// Only uploaded files are ours to remove.
async function removeUpload(src) {
  if (typeof src === 'string' && src.startsWith('/uploads/')) {
    await unlink(join(uploadsDir(), basename(src))).catch(() => {})
  }
}

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

  let van
  try {
    van = await mutate((content) => {
      const target = content.vans.items.find((v) => v.id === req.params.id)
      // Re-checked here, against the live content the callback receives,
      // rather than before mutate() is called: two overlapping PATCHes could
      // otherwise both pass a pre-check and land on the same slug. Thrown
      // before any field is written, so a losing request touches nothing.
      if (
        req.body?.slug !== undefined &&
        content.vans.items.some((v) => v.id !== req.params.id && v.slug === req.body.slug)
      ) {
        throw new SlugTakenError()
      }
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
  } catch (err) {
    if (err instanceof SlugTakenError) {
      res.status(400).json({ error: 'another van already uses that URL' })
      return
    }
    throw err
  }

  res.json({ van })
})

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

  let van
  try {
    van = await mutate((content) => {
      const target = content.vans.items.find((v) => v.id === req.params.id)
      // The existence check above ran outside mutate()'s queue, so a
      // concurrent DELETE could have removed this van in the meantime.
      // Re-checked here, before the write, so we never assign onto a
      // vanished record.
      if (!target) throw new VanGoneError()
      target[field] = `/uploads/${name}`
      return target
    })
  } catch (err) {
    if (err instanceof VanGoneError) {
      // The file already landed on disk for a van that no longer exists by
      // the time the write was applied — clean it up rather than leaving an
      // orphan nothing will ever reach.
      await removeUpload(`/uploads/${name}`)
      res.status(404).json({ error: 'not found' })
      return
    }
    throw err
  }

  // Only after the new path is committed, so a failed unlink cannot orphan the
  // record from its image.
  await removeUpload(previous)

  res.json({ van })
})

router.delete('/:id', async (req, res) => {
  if (!findVan(req.params.id)) {
    res.status(404).json({ error: 'not found' })
    return
  }

  const collection = `van:${req.params.id}`

  // Gathered from inside the mutate() callback rather than from the pre-check
  // above, so a concurrent upload landing in between (a new image path, a new
  // gallery photo) is still captured — the files removed below always match
  // what was actually committed, not a stale snapshot.
  let removed
  try {
    removed = await mutate((content) => {
      const target = content.vans.items.find((v) => v.id === req.params.id)
      if (!target) throw new VanGoneError()

      const files = [target.image, target.floorplan]
      content.photos = content.photos.filter((p) => {
        if (p.collection !== collection) return true
        files.push(p.src)
        return false
      })
      content.vans.items = content.vans.items.filter((v) => v.id !== req.params.id)
      return files
    })
  } catch (err) {
    if (err instanceof VanGoneError) {
      res.status(404).json({ error: 'not found' })
      return
    }
    throw err
  }

  for (const src of removed) {
    await removeUpload(src)
  }

  res.json({ ok: true })
})

export default router
