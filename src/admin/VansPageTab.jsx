import { useState } from 'react'
import { patchVansPage } from './api.js'

const FIELDS = [
  { field: 'eyebrow', label: 'Eyebrow', hint: 'The small line above the heading.' },
  { field: 'heading', label: 'Heading', hint: 'The big line at the top of /vans.' },
  { field: 'sub', label: 'Intro paragraph', hint: 'One or two sentences under the heading.' },
]

export default function VansPageTab({ page, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function save(patch) {
    setBusy(true)
    setError(null)
    try {
      await patchVansPage(patch)
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card">
      <h2 className="admin-card__title">Range intro</h2>
      <p className="admin-hint">
        This copy sits above the van cards on /vans and on the home page.
      </p>

      {FIELDS.map(({ field, label, hint }) => (
        <div className="admin-form__cell" key={field}>
          <label className="admin-field" htmlFor={`page-${field}`}>
            {label}
          </label>
          <input
            id={`page-${field}`}
            className="admin-input"
            defaultValue={page[field] ?? ''}
            onBlur={(event) => {
              if (event.target.value !== (page[field] ?? '')) save({ [field]: event.target.value })
            }}
          />
          <p className="admin-hint">{hint}</p>
        </div>
      ))}

      {busy && <p className="admin-status admin-status--live">Saving…</p>}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
