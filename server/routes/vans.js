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
