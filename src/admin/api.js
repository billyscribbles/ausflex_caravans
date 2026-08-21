// Thin wrappers over /api. Every one rejects with an Error carrying .status so
// callers can distinguish 401 (session expired) from 429 (rate limited).
async function request(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.error || `Request failed (${res.status})`), {
      status: res.status,
    })
  }
  return res.json()
}

const asJson = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const exportUrl = '/api/admin/export'

export const getSession = () => request('/api/auth/session')
export const login = (password) => request('/api/auth/login', asJson({ password }))
export const logout = () => request('/api/auth/logout', { method: 'POST' })
// /api/content is cached for 60s for the public site's benefit. The dashboard
// reads back its own writes, so it must bypass that cache — otherwise an
// uploaded photo does not appear for up to a minute and the client uploads it
// again.
export const getContent = () => request('/api/content', { cache: 'no-store' })

export function uploadPhoto({ file, collection, alt, caption }) {
  const form = new FormData()
  form.append('file', file)
  form.append('collection', collection)
  form.append('alt', alt ?? '')
  form.append('caption', caption ?? '')
  return request('/api/photos', { method: 'POST', body: form })
}

export const patchPhoto = (id, patch) =>
  request(`/api/photos/${id}`, { ...asJson(patch), method: 'PATCH' })
export const reorderPhotos = (collection, ids) =>
  request('/api/photos/reorder', asJson({ collection, ids }))
export const deletePhoto = (id) => request(`/api/photos/${id}`, { method: 'DELETE' })

export const createTour = (body) => request('/api/tours', asJson(body))
export const patchTour = (id, patch) =>
  request(`/api/tours/${id}`, { ...asJson(patch), method: 'PATCH' })
export const reorderTours = (ids) => request('/api/tours/reorder', asJson({ ids }))
export const deleteTour = (id) => request(`/api/tours/${id}`, { method: 'DELETE' })
