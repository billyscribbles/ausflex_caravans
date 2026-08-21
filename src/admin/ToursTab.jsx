import { useState } from 'react'
import { createTour, patchTour, reorderTours, deleteTour, exportUrl } from './api.js'

// Mirrors the server's allowlist so a typo is caught before a round trip. The
// server still validates — this is convenience, not the control.
const ALLOWED = ['kuula.co', 'matterport.com']
const BAD_URL = 'Embed URL must be an https link to kuula.co or matterport.com.'

function isAllowed(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return false
    return ALLOWED.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}

export default function ToursTab({ tours, onChange }) {
  const [title, setTitle] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const items = [...tours].sort((a, b) => a.sortOrder - b.sortOrder)

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onAdd(event) {
    event.preventDefault()
    if (!isAllowed(embedUrl)) {
      setError(BAD_URL)
      return
    }
    await run(() => createTour({ title, embedUrl }))
    setTitle('')
    setEmbedUrl('')
  }

  function move(index, delta) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    run(() => reorderTours(next.map((t) => t.id)))
  }

  return (
    <div className="admin-panel">
      <ul className="admin-list">
        {items.map((tourItem, i) => (
          <li key={tourItem.id} className="admin-row">
            <div className="admin-row__fields">
              <label className="admin-field" htmlFor={`title-${tourItem.id}`}>
                Tour name
              </label>
              <input
                id={`title-${tourItem.id}`}
                className="admin-input"
                defaultValue={tourItem.title}
                onBlur={(e) => {
                  if (e.target.value !== tourItem.title) {
                    run(() => patchTour(tourItem.id, { title: e.target.value }))
                  }
                }}
              />

              <label className="admin-field" htmlFor={`url-${tourItem.id}`}>
                Embed URL
              </label>
              <input
                id={`url-${tourItem.id}`}
                className="admin-input"
                defaultValue={tourItem.embedUrl}
                onBlur={(e) => {
                  if (e.target.value === tourItem.embedUrl) return
                  if (!isAllowed(e.target.value)) {
                    setError(BAD_URL)
                    return
                  }
                  run(() => patchTour(tourItem.id, { embedUrl: e.target.value }))
                }}
              />

              {i === 0 && <p className="admin-hint">This tour is shown on the home page.</p>}
            </div>

            <div className="admin-row__actions">
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => move(i, -1)}
                disabled={busy || i === 0}
                aria-label={`Move ${tourItem.title} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => move(i, 1)}
                disabled={busy || i === items.length - 1}
                aria-label={`Move ${tourItem.title} later`}
              >
                ↓
              </button>

              {confirming === tourItem.id ? (
                <span className="admin-confirm">
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => {
                      setConfirming(null)
                      run(() => deleteTour(tourItem.id))
                    }}
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--quiet"
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => setConfirming(tourItem.id)}
                  aria-label={`Delete ${tourItem.title}`}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form className="admin-add" onSubmit={onAdd}>
        <h2 className="admin-add__title">Add a tour</h2>

        <label className="admin-field" htmlFor="new-title">
          New tour name
        </label>
        <input
          id="new-title"
          className="admin-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label className="admin-field" htmlFor="new-url">
          New embed URL
        </label>
        <input
          id="new-url"
          className="admin-input"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="https://kuula.co/share/collection/…"
          required
        />

        <button className="admin-button" type="submit" disabled={busy}>
          Add tour
        </button>
      </form>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <p className="admin-hint">
        Railway volumes are not backed up automatically.{' '}
        <a href={exportUrl}>Download a copy of your content</a> now and then, and keep your original
        photos.
      </p>
    </div>
  )
}
