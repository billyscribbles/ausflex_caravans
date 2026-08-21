// Tour embed URLs land in an <iframe src>, so they are validated against a
// host allowlist rather than merely parsed. Only an authenticated user can set
// one, but the check costs five lines.
const TOUR_HOSTS = ['kuula.co', 'matterport.com']

// SVG is deliberately absent: it can carry script and we serve uploads from
// our own origin.
const MIME_EXT = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export function isValidEmbedUrl(value) {
  if (typeof value !== 'string' || value === '') return false
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  // Userinfo can disguise the real host ("https://kuula.co@evil.com"), so
  // anything with credentials is refused outright.
  if (url.username || url.password) return false
  return TOUR_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
}

export function extForMime(mime) {
  return MIME_EXT[mime] ?? null
}
