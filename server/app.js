import express from 'express'
import cookieParser from 'cookie-parser'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { uploadsDir, read } from './store.js'
import contentRoutes from './routes/content.js'
import authRoutes, { requireAuth } from './routes/auth.js'
import photoRoutes from './routes/photos.js'
import tourRoutes from './routes/tours.js'

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
  app.use('/api/auth', authRoutes)
  app.use('/api/photos', photoRoutes)
  app.use('/api/tours', tourRoutes)

  // Railway volumes are not backed up. This is the client's escape hatch for
  // the metadata; the image files themselves need manual recovery.
  app.get('/api/admin/export', requireAuth, (req, res) => {
    res.set('Content-Disposition', 'attachment; filename="ausflex-content.json"')
    res.json(read())
  })

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
