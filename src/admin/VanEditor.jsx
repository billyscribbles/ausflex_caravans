import { useRef, useState } from 'react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { patchVan, uploadVanImage } from './api.js'
import { resizeImage } from './resizeImage.js'
import PhotosTab from './PhotosTab.jsx'

// Paragraphs are stored as an array but edited as one textarea — blank lines
// are the separator, which is how the copy reads anyway.
const toText = (paragraphs) => (paragraphs ?? []).join('\n\n')
const toParagraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

const TEXT_FIELDS = [
  { field: 'name', label: 'Van name', hint: null },
  { field: 'slug', label: 'Web address', hint: 'Changing this breaks the old link.' },
  { field: 'length', label: 'Van length', hint: null },
  { field: 'tag', label: 'Category', hint: null },
  { field: 'meta', label: 'Sleeps / axles line', hint: null },
]

// The hero and the floorplan are the same widget twice — a framed slot beside
// its own file input and alt-text field — so it is written once.
function SingleImage({ van, field, title, label, altLabel, hint, onUpload, onAlt, busy }) {
  const input = useRef(null)
  const src = van[field]
  const altField = `${field}Alt`

  return (
    <section className="admin-card">
      <h2 className="admin-card__title">{title}</h2>

      <div className="admin-single">
        <div className="admin-single__frame">
          {src ? <img src={src} alt="" /> : <span className="admin-single__empty">No image</span>}
        </div>

        <div className="admin-single__side">
          <label className="admin-field" htmlFor={`van-${field}-file`}>
            {label}
          </label>
          <input
            id={`van-${field}-file`}
            ref={input}
            className="admin-file"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (file) await onUpload(file)
              if (input.current) input.current.value = ''
            }}
          />

          <label className="admin-field" htmlFor={`van-${altField}`}>
            {altLabel}
          </label>
          <input
            id={`van-${altField}`}
            className="admin-input"
            defaultValue={van[altField] ?? ''}
            onBlur={(event) => {
              if (event.target.value !== (van[altField] ?? '')) onAlt(event.target.value)
            }}
          />
          <p className="admin-hint">{hint}</p>
        </div>
      </div>
    </section>
  )
}

export default function VanEditor({ van, onChange, onBack }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [spec, setSpec] = useState('')

  async function save(patch) {
    setBusy(true)
    setError(null)
    try {
      await patchVan(van.id, patch)
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const onBlurField = (field) => (event) => {
    if (event.target.value !== (van[field] ?? '')) save({ [field]: event.target.value })
  }

  async function upload(field, original) {
    setBusy(true)
    setError(null)
    try {
      // Resized in the browser first, exactly as the photo tabs do: a 9MB
      // phone photo arrives as roughly 300KB.
      const file = await resizeImage(original)
      await uploadVanImage({ id: van.id, field, file })
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className="admin-backlink" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" />
        All vans
      </button>

      <p className="admin-editor__url">
        Lives at <strong>/vans/{van.slug}</strong>
      </p>

      {busy && <p className="admin-status admin-status--live">Saving…</p>}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <section className="admin-card">
        <h2 className="admin-card__title">Details</h2>
        {TEXT_FIELDS.map(({ field, label, hint }) => (
          <div className="admin-form__cell" key={field}>
            <label className="admin-field" htmlFor={`van-${field}`}>
              {label}
            </label>
            <input
              id={`van-${field}`}
              className="admin-input"
              defaultValue={van[field] ?? ''}
              onBlur={onBlurField(field)}
            />
            {hint && <p className="admin-hint">{hint}</p>}
          </div>
        ))}
      </section>

      <section className="admin-card">
        <h2 className="admin-card__title">Copy</h2>

        <div className="admin-form__cell">
          <label className="admin-field" htmlFor="van-blurb">
            Short blurb
          </label>
          <input
            id="van-blurb"
            className="admin-input"
            defaultValue={van.blurb ?? ''}
            onBlur={onBlurField('blurb')}
          />
          <p className="admin-hint">One sentence, shown under the van name.</p>
        </div>

        <div className="admin-form__cell">
          <label className="admin-field" htmlFor="van-description">
            Full description
          </label>
          <textarea
            id="van-description"
            className="admin-input admin-textarea"
            rows={8}
            defaultValue={toText(van.description)}
            onBlur={(event) => {
              const next = toParagraphs(event.target.value)
              if (toText(next) !== toText(van.description)) save({ description: next })
            }}
          />
          <p className="admin-hint">Leave a blank line between paragraphs.</p>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card__title">Specs</h2>
        <p className="admin-hint">The short chips under the main photo.</p>

        <ul className="admin-chips">
          {(van.specs ?? []).map((entry) => (
            <li className="admin-chip" key={entry}>
              {entry}
              <button
                type="button"
                className="admin-icon admin-icon--danger"
                aria-label={`Remove ${entry}`}
                onClick={() => save({ specs: van.specs.filter((s) => s !== entry) })}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!spec.trim()) return
            save({ specs: [...(van.specs ?? []), spec.trim()] })
            setSpec('')
          }}
        >
          <div className="admin-form__cell">
            <label className="admin-field" htmlFor="van-new-spec">
              New spec
            </label>
            <input
              id="van-new-spec"
              className="admin-input"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="Solar ready"
            />
          </div>
          <button className="admin-button" type="submit" disabled={busy}>
            <Plus size={15} aria-hidden="true" />
            Add spec
          </button>
        </form>
      </section>

      <SingleImage
        van={van}
        field="image"
        title="Main photo"
        label="Replace the main photo"
        altLabel="Describe the main photo"
        hint="Shown on the range cards and at the top of the van's page."
        busy={busy}
        onUpload={(file) => upload('image', file)}
        onAlt={(value) => save({ imageAlt: value })}
      />

      <SingleImage
        van={van}
        field="floorplan"
        title="Floorplan"
        label="Replace the floorplan"
        altLabel="Describe the floorplan"
        hint="The blueprint drawing beside the description. Leave empty to hide it."
        busy={busy}
        onUpload={(file) => upload('floorplan', file)}
        onAlt={(value) => save({ floorplanAlt: value })}
      />

      <section className="admin-card">
        <h2 className="admin-card__title">In the flesh</h2>
        <p className="admin-hint">The photo grid at the bottom of this van's page.</p>
        <PhotosTab
          key={van.id}
          collection={`van:${van.id}`}
          label={`${van.name} photos`}
          photos={van.photos ?? []}
          onChange={onChange}
        />
      </section>
    </>
  )
}
