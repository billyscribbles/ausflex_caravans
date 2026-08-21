import { useRef, useState } from 'react'
import { uploadPhoto, patchPhoto, reorderPhotos, deletePhoto } from './api.js'
import { resizeImage } from './resizeImage.js'

const COLLECTIONS = [
  { id: 'interiors', label: 'Interiors rail (home)' },
  { id: 'exteriors', label: 'Exteriors (gallery)' },
  { id: 'page', label: 'Gallery page' },
]

// GalleryGrid.css tiles the mosaic in blocks of nine, so a count that is not a
// multiple of nine ends on a short row. Surface it rather than let the client
// discover it on the live site.
function blockHint(count) {
  const remainder = count % 9
  if (count === 0) return 'No photos yet.'
  if (remainder === 0) return `${count} photos · ${count / 9} full blocks ✓`
  return `${count} photos · last row will be short (add ${9 - remainder} or remove ${remainder})`
}

export default function PhotosTab({ photos, onChange }) {
  const [collection, setCollection] = useState('page')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const fileInput = useRef(null)

  const items = photos
    .filter((p) => p.collection === collection)
    .sort((a, b) => a.sortOrder - b.sortOrder)

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

  async function onFiles(fileList) {
    const files = Array.from(fileList)
    await run(async () => {
      for (const original of files) {
        const file = await resizeImage(original)
        await uploadPhoto({ file, collection, alt: '', caption: '' })
      }
    })
    if (fileInput.current) fileInput.current.value = ''
  }

  function move(index, delta) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    run(() =>
      reorderPhotos(
        collection,
        next.map((p) => p.id),
      ),
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <label className="admin-field" htmlFor="collection">
          Collection
        </label>
        <select
          id="collection"
          className="admin-input"
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
        >
          {COLLECTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {collection === 'page' && <p className="admin-hint">{blockHint(items.length)}</p>}

      <label className="admin-field" htmlFor="photo-upload">
        Add photos
      </label>
      <input
        id="photo-upload"
        ref={fileInput}
        className="admin-input"
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        onChange={(e) => onFiles(e.target.files)}
      />

      {busy && <p className="admin-status">Working…</p>}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <ul className="admin-list">
        {items.map((photo, i) => (
          <li key={photo.id} className="admin-row">
            <img className="admin-thumb" src={photo.src} alt="" />

            <div className="admin-row__fields">
              <label className="admin-field" htmlFor={`alt-${photo.id}`}>
                Alt text (optional)
              </label>
              <input
                id={`alt-${photo.id}`}
                className="admin-input"
                defaultValue={photo.alt}
                onBlur={(e) => {
                  if (e.target.value !== photo.alt) {
                    run(() => patchPhoto(photo.id, { alt: e.target.value }))
                  }
                }}
              />

              <label className="admin-field" htmlFor={`caption-${photo.id}`}>
                Caption (optional)
              </label>
              <input
                id={`caption-${photo.id}`}
                className="admin-input"
                defaultValue={photo.caption}
                onBlur={(e) => {
                  if (e.target.value !== photo.caption) {
                    run(() => patchPhoto(photo.id, { caption: e.target.value }))
                  }
                }}
              />
            </div>

            <div className="admin-row__actions">
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => move(i, -1)}
                disabled={busy || i === 0}
                aria-label={`Move photo ${i + 1} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => move(i, 1)}
                disabled={busy || i === items.length - 1}
                aria-label={`Move photo ${i + 1} later`}
              >
                ↓
              </button>

              {confirming === photo.id ? (
                <span className="admin-confirm">
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => {
                      setConfirming(null)
                      run(() => deletePhoto(photo.id))
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
                  onClick={() => setConfirming(photo.id)}
                  aria-label={`Delete photo ${i + 1}`}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
