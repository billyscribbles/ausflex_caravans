import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { read, mutate } from '../store.js'
import { isValidEmbedUrl } from '../validate.js'
import { requireAuth } from './auth.js'
import { asyncHandler } from '../asyncHandler.js'

const BAD_URL = 'embed URL must be an https kuula.co or matterport.com link'

const router = Router()
router.use(requireAuth)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, embedUrl, poster } = req.body ?? {}
    if (!title) {
      res.status(400).json({ error: 'title is required' })
      return
    }
    if (!isValidEmbedUrl(embedUrl)) {
      res.status(400).json({ error: BAD_URL })
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
  }),
)

router.post(
  '/reorder',
  asyncHandler(async (req, res) => {
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
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!read().tours.some((t) => t.id === req.params.id)) {
      res.status(404).json({ error: 'not found' })
      return
    }
    if (req.body?.embedUrl !== undefined && !isValidEmbedUrl(req.body.embedUrl)) {
      res.status(400).json({ error: BAD_URL })
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
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!read().tours.some((t) => t.id === req.params.id)) {
      res.status(404).json({ error: 'not found' })
      return
    }
    await mutate((content) => {
      content.tours = content.tours.filter((t) => t.id !== req.params.id)
    })
    res.json({ ok: true })
  }),
)

export default router
