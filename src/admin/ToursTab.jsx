import { useState } from 'react'
import { ArrowUp, ArrowDown, Trash2, Check, X, Plus } from 'lucide-react'
import { createTour, patchTour, reorderTours, deleteTour } from './api.js'

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
    <>
      <section className="admin-card">
        <h2 className="admin-card__title">Add a tour</h2>
        <form className="admin-form" onSubmit={onAdd}>
          <div className="admin-form__row">
            <div className="admin-form__cell">
              <label className="admin-field" htmlFor="new-title">
                New tour name
              </label>
              <input
                id="new-title"
                className="admin-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Explorer 21"
                required
              />
            </div>
            <div className="admin-form__cell">
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
            </div>
          </div>

          <button className="admin-button" type="submit" disabled={busy}>
            <Plus size={15} aria-hidden="true" />
            Add tour
          </button>
        </form>

        <p className="admin-hint">Kuula and Matterport links only. Anything else is refused.</p>
        {busy && <p className="admin-status admin-status--live">Working…</p>}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {items.length === 0 ? (
        <p className="admin-empty">
          No tours yet. Add one above and it appears on /360 straight away.
        </p>
      ) : (
        <ul className="admin-grid admin-grid--wide">
          {items.map((tourItem, i) => (
            <li key={tourItem.id} className="admin-tile">
              <div className="admin-tile__body">
                <div className="admin-tile__meta">
                  <span className="admin-tile__ordinal admin-tile__ordinal--inline">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {i === 0 && <span className="admin-badge">Shown on the home page</span>}
                </div>

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
              </div>

              <div className="admin-tile__foot">
                {confirming === tourItem.id ? (
                  <div className="admin-confirm">
                    <span className="admin-confirm__q">Delete for good?</span>
                    <button
                      type="button"
                      className="admin-icon admin-icon--danger"
                      onClick={() => {
                        setConfirming(null)
                        run(() => deleteTour(tourItem.id))
                      }}
                    >
                      <Check size={15} aria-hidden="true" />
                      <span className="sr-only">Confirm delete {tourItem.title}</span>
                    </button>
                    <button
                      type="button"
                      className="admin-icon"
                      onClick={() => setConfirming(null)}
                    >
                      <X size={15} aria-hidden="true" />
                      <span className="sr-only">Cancel</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="admin-tile__order">
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => move(i, -1)}
                        disabled={busy || i === 0}
                        aria-label={`Move ${tourItem.title} earlier`}
                      >
                        <ArrowUp size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => move(i, 1)}
                        disabled={busy || i === items.length - 1}
                        aria-label={`Move ${tourItem.title} later`}
                      >
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="admin-icon admin-icon--danger"
                      onClick={() => setConfirming(tourItem.id)}
                      aria-label={`Delete ${tourItem.title}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="admin-note">
        Railway volumes are not backed up automatically. Use <strong>Download backup</strong> in the
        sidebar now and then, and keep your original photos.
      </p>
    </>
  )
}
