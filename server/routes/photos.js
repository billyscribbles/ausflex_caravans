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
