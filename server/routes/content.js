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
    // The seed version the store is on. Cheap to publish and it is what lets
    // `yarn pull:prod` mirror production exactly, so a migration can be
    // rehearsed against the client's real data before the deploy that runs it.
    version: content.version ?? 0,
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
