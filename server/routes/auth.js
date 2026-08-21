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
