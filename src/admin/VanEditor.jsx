import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Plus, Save, X } from 'lucide-react'
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

// Every field the Save button owns. Typing edits a local draft; nothing
// reaches the database until Save sends the changed fields in one PATCH.
const DRAFT_FIELDS = ['name', 'slug', 'length', 'tag', 'meta', 'blurb', 'imageAlt', 'floorplanAlt']

const toDraft = (van) => ({
  ...Object.fromEntries(DRAFT_FIELDS.map((field) => [field, van[field] ?? ''])),
  description: toText(van.description),
})

// The hero and the floorplan are the same widget twice — a framed slot beside
// its own file input and alt-text field — so it is written once.
function SingleImage({
  van,
  field,
  title,
  label,
  altLabel,
  hint,
  onUpload,
  altValue,
  onAlt,
  busy,
}) {
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
            value={altValue}
            onChange={(event) => onAlt(event.target.value)}
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
  // null means "no edits yet" — the inputs then show the van as saved. A
  // refresh after an upload or spec change swaps the van prop without
  // remounting, so an in-progress draft survives those.
  const [draft, setDraft] = useState(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmingBack, setConfirmingBack] = useState(false)

  const base = toDraft(van)
  const current = draft ?? base
  const dirty = Object.keys(base).some((field) => current[field] !== base[field])

  const edit = (field) => (value) => {
    setSavedFlash(false)
    setConfirmingBack(false)
    setDraft({ ...current, [field]: value })
  }

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function save(patch) {
    setBusy(true)
    setError(null)
    try {
      await patchVan(van.id, patch)
      await onChange()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function saveDraft() {
    const patch = {}
    for (const field of DRAFT_FIELDS) {
      if (current[field] !== base[field]) patch[field] = current[field]
    }
    if (current.description !== base.description) {
      patch.description = toParagraphs(current.description)
    }
    // A failed write keeps the draft on screen so nothing typed is lost.
    if (await save(patch)) {
      setDraft(null)
      setSavedFlash(true)
    }
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
      <button
        type="button"
        className="admin-backlink"
        onClick={() => {
          if (dirty && !confirmingBack) {
            setConfirmingBack(true)
            return
          }
          onBack()
        }}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {dirty && confirmingBack ? 'Discard unsaved changes?' : 'All vans'}
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
              value={current[field]}
              onChange={(event) => edit(field)(event.target.value)}
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
            value={current.blurb}
            onChange={(event) => edit('blurb')(event.target.value)}
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
            value={current.description}
            onChange={(event) => edit('description')(event.target.value)}
          />
          <p className="admin-hint">Leave a blank line between paragraphs.</p>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card__title">Specs</h2>
        <p className="admin-hint">The short chips under the main photo.</p>

        <ul className="admin-chips">
          {/* Keyed and filtered by index, not value: specs is append/remove-only
              (never reordered), and two chips can carry identical text — a
              value-keyed filter would remove every chip that matches instead
              of just the one clicked. */}
          {(van.specs ?? []).map((entry, index) => (
            <li className="admin-chip" key={index}>
              {entry}
              <button
                type="button"
                className="admin-icon admin-icon--danger"
                aria-label={`Remove ${entry}`}
                onClick={() => save({ specs: van.specs.filter((_, i) => i !== index) })}
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
        altValue={current.imageAlt}
        onAlt={edit('imageAlt')}
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
        altValue={current.floorplanAlt}
        onAlt={edit('floorplanAlt')}
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

      {/* Sticky, so the button and the draft's status stay in view however far
          down the editor the last edit happened. */}
      <div className="admin-savebar">
        <button
          type="button"
          className="admin-button"
          onClick={saveDraft}
          disabled={busy || !dirty}
        >
          <Save size={15} aria-hidden="true" />
          Save changes
        </button>
        {(dirty || savedFlash) && (
          <p className="admin-status admin-savebar__status" role="status">
            {busy ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}
          </p>
        )}
      </div>
    </>
  )
}
