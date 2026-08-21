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

// Slugs land in a URL segment and in a React key, so they are constrained
// rather than merely trimmed.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const VAN_TEXT_LIMITS = {
  name: 80,
  slug: 60,
  length: 60,
  tag: 60,
  meta: 60,
  blurb: 400,
  imageAlt: 200,
  floorplanAlt: 200,
}

export const MAX_DESCRIPTION_ITEMS = 20
export const MAX_DESCRIPTION_CHARS = 2000
export const MAX_SPEC_ITEMS = 12
export const MAX_SPEC_CHARS = 60
export const MAX_PAGE_CHARS = 300

export function isValidSlug(value) {
  return typeof value === 'string' && value.length <= VAN_TEXT_LIMITS.slug && SLUG_RE.test(value)
}

export function slugify(name) {
  const base = String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, VAN_TEXT_LIMITS.slug)
    .replace(/^-+|-+$/g, '')
  return base || 'van'
}

export function uniqueSlug(name, taken) {
  const base = slugify(name)
  if (!taken.includes(base)) return base
  // The base can already sit at the 60-char cap, so the suffix must borrow
  // its room from the base rather than extend past it — otherwise the
  // result would fail this module's own isValidSlug.
  let n = 2
  let candidate
  do {
    const suffix = `-${n}`
    const trimmedBase = base.slice(0, VAN_TEXT_LIMITS.slug - suffix.length).replace(/-+$/, '')
    candidate = `${trimmedBase}${suffix}`
    n += 1
  } while (taken.includes(candidate))
  return candidate
}

function listError(value, label, maxItems, maxChars) {
  if (!Array.isArray(value)) return `${label} must be a list`
  if (value.length > maxItems) return `${label} must be ${maxItems} entries or fewer`
  if (value.some((entry) => typeof entry !== 'string')) return `${label} must be a list of text`
  if (value.some((entry) => entry.length > maxChars)) {
    return `each ${label === 'description' ? 'paragraph' : 'spec'} must be ${maxChars} characters or fewer`
  }
  return null
}

// Returns an error message, or null when the patch is acceptable. These are
// guardrails against a paste accident, not a security boundary — express.json's
// 256kb limit is that.
export function validateVanPatch(patch) {
  for (const [field, max] of Object.entries(VAN_TEXT_LIMITS)) {
    const value = patch?.[field]
    if (value === undefined) continue
    if (typeof value !== 'string') return `${field} must be text`
    if (value.length > max) return `${field} must be ${max} characters or fewer`
  }
  if (patch?.slug !== undefined && !isValidSlug(patch.slug)) {
    return 'slug must be lowercase letters, numbers and hyphens'
  }
  if (patch?.description !== undefined) {
    const error = listError(
      patch.description,
      'description',
      MAX_DESCRIPTION_ITEMS,
      MAX_DESCRIPTION_CHARS,
    )
    if (error) return error
  }
  if (patch?.specs !== undefined) {
    const error = listError(patch.specs, 'specs', MAX_SPEC_ITEMS, MAX_SPEC_CHARS)
    if (error) return error
  }
  return null
}
