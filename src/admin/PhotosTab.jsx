import { useRef, useState } from 'react'
import { ImagePlus, ArrowUp, ArrowDown, Trash2, Check, X } from 'lucide-react'
import { uploadPhoto, patchPhoto, reorderPhotos, deletePhoto } from './api.js'
import { resizeImage } from './resizeImage.js'

// GalleryGrid.css tiles the mosaic in blocks of nine, so a count that is not a
// multiple of nine ends on a short row. Surface it rather than let the client
// discover it on the live site.
function blockHint(count) {
  const remainder = count % 9
  if (count === 0) return 'No photos yet.'
  if (remainder === 0) return `${count} photos · ${count / 9} full blocks ✓`
  return `${count} photos · last row will be short (add ${9 - remainder} or remove ${remainder})`
}

export default function PhotosTab({ collection, label, photos, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef(null)

  const items = [...photos].sort((a, b) => a.sortOrder - b.sortOrder)

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
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
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
    <>
      <section className="admin-uploader">
        <label
          className={`admin-drop${dragging ? ' admin-drop--over' : ''}`}
          htmlFor={`upload-${collection}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            onFiles(e.dataTransfer.files)
          }}
        >
          <ImagePlus size={22} aria-hidden="true" />
          <span className="admin-drop__lead">Drop photos here, or click to choose</span>
          <span className="admin-drop__meta">
            Resized and converted on upload. Added to the end of {label}.
          </span>
        </label>
        <input
          id={`upload-${collection}`}
          ref={fileInput}
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => onFiles(e.target.files)}
        />

        {collection === 'page' && <p className="admin-hint">{blockHint(items.length)}</p>}
        {busy && <p className="admin-status admin-status--live">Working…</p>}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {items.length === 0 ? (
        <p className="admin-empty">
          Nothing in {label} yet. The first photo you add lands here and goes live straight away.
        </p>
      ) : (
        <ul className="admin-grid">
          {items.map((photo, i) => (
            <li key={photo.id} className="admin-tile">
              <div className="admin-tile__frame">
                <img className="admin-tile__img" src={photo.src} alt="" loading="lazy" />
                <span className="admin-tile__ordinal">{String(i + 1).padStart(2, '0')}</span>
              </div>

              <div className="admin-tile__body">
                <label className="admin-field" htmlFor={`alt-${photo.id}`}>
                  Alt text
                </label>
                <input
                  id={`alt-${photo.id}`}
                  className="admin-input"
                  placeholder="Describe the photo"
                  defaultValue={photo.alt}
                  onBlur={(e) => {
                    if (e.target.value !== photo.alt) {
                      run(() => patchPhoto(photo.id, { alt: e.target.value }))
                    }
                  }}
                />

                <label className="admin-field" htmlFor={`caption-${photo.id}`}>
                  Caption
                </label>
                <input
                  id={`caption-${photo.id}`}
                  className="admin-input"
                  placeholder="Optional"
                  defaultValue={photo.caption}
                  onBlur={(e) => {
                    if (e.target.value !== photo.caption) {
                      run(() => patchPhoto(photo.id, { caption: e.target.value }))
                    }
                  }}
                />
              </div>

              <div className="admin-tile__foot">
                {confirming === photo.id ? (
                  <div className="admin-confirm">
                    <span className="admin-confirm__q">Delete for good?</span>
                    <button
                      type="button"
                      className="admin-icon admin-icon--danger"
                      title="Confirm delete"
                      onClick={() => {
                        setConfirming(null)
                        run(() => deletePhoto(photo.id))
                      }}
                    >
                      <Check size={15} aria-hidden="true" />
                      <span className="sr-only">Confirm delete</span>
                    </button>
                    <button
                      type="button"
                      className="admin-icon"
                      title="Keep it"
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
                        aria-label={`Move photo ${i + 1} earlier`}
                      >
                        <ArrowUp size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => move(i, 1)}
                        disabled={busy || i === items.length - 1}
                        aria-label={`Move photo ${i + 1} later`}
                      >
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="admin-icon admin-icon--danger"
                      onClick={() => setConfirming(photo.id)}
                      aria-label={`Delete photo ${i + 1}`}
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
    </>
  )
}
