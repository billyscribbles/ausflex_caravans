import { useState } from 'react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { patchVan } from './api.js'

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
    </>
  )
}
