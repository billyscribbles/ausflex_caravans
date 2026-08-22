import { useState } from 'react'
import { ArrowUp, ArrowDown, Trash2, Check, X, Plus, Pencil } from 'lucide-react'
import { createVan, reorderVans, deleteVan } from './api.js'
import VanEditor from './VanEditor.jsx'

export default function VansTab({ vans, onChange }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [typed, setTyped] = useState('')
  const [editingId, setEditingId] = useState(null)

  const items = [...vans.items].sort((a, b) => a.sortOrder - b.sortOrder)
  const editing = items.find((v) => v.id === editingId)

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
    await run(() => createVan({ name }))
    setName('')
  }

  function move(index, delta) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    run(() => reorderVans(next.map((v) => v.id)))
  }

  if (editing) {
    return <VanEditor van={editing} onChange={onChange} onBack={() => setEditingId(null)} />
  }

  return (
    <>
      <section className="admin-card">
        <h2 className="admin-card__title">Add a van</h2>
        <form className="admin-form" onSubmit={onAdd}>
          <div className="admin-form__cell">
            <label className="admin-field" htmlFor="new-van-name">
              New van name
            </label>
            <input
              id="new-van-name"
              className="admin-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Desert Runner"
              required
            />
          </div>
          <button className="admin-button" type="submit" disabled={busy}>
            <Plus size={15} aria-hidden="true" />
            Add van
          </button>
        </form>
        <p className="admin-hint">
          The web address is made from the name. Add it here, then fill in the details.
        </p>
        {busy && <p className="admin-status admin-status--live">Working…</p>}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {items.length === 0 ? (
        <p className="admin-empty">No vans yet. Add one above and it appears on /vans.</p>
      ) : (
        <ul className="admin-grid admin-grid--wide">
          {items.map((van, i) => (
            <li key={van.id} className="admin-tile">
              <div className="admin-tile__body">
                <div className="admin-vanrow">
                  <div className="admin-vanrow__thumb">
                    {van.image && <img src={van.image} alt="" />}
                  </div>
                  <div>
                    <span className="admin-tile__ordinal admin-tile__ordinal--inline">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="admin-vanrow__name">{van.name}</p>
                    <p className="admin-vanrow__meta">
                      {[van.length, van.tag].filter(Boolean).join(' · ') || 'No details yet'}
                    </p>
                    <p className="admin-vanrow__url">/vans/{van.slug}</p>
                  </div>
                </div>
              </div>

              <div className="admin-tile__foot">
                {confirming === van.id ? (
                  <div className="admin-confirm admin-confirm--typed">
                    <label className="admin-field" htmlFor={`confirm-${van.id}`}>
                      Type the van name to delete it
                    </label>
                    <input
                      id={`confirm-${van.id}`}
                      className="admin-input"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                    />
                    <div className="admin-confirm__actions">
                      <button
                        type="button"
                        className="admin-icon admin-icon--danger"
                        disabled={typed.trim() !== van.name}
                        onClick={() => {
                          setConfirming(null)
                          setTyped('')
                          run(() => deleteVan(van.id))
                        }}
                      >
                        <Check size={15} aria-hidden="true" />
                        <span className="sr-only">Confirm delete {van.name}</span>
                      </button>
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => {
                          setConfirming(null)
                          setTyped('')
                        }}
                      >
                        <X size={15} aria-hidden="true" />
                        <span className="sr-only">Cancel</span>
                      </button>
                    </div>
                    <p className="admin-hint">
                      Deleting removes /vans/{van.slug} for good, along with its photos.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="admin-tile__order">
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => move(i, -1)}
                        disabled={busy || i === 0}
                        aria-label={`Move ${van.name} earlier`}
                      >
                        <ArrowUp size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="admin-icon"
                        onClick={() => move(i, 1)}
                        disabled={busy || i === items.length - 1}
                        aria-label={`Move ${van.name} later`}
                      >
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="admin-button admin-button--ghost"
                      onClick={() => setEditingId(van.id)}
                    >
                      <Pencil size={15} aria-hidden="true" />
                      Edit {van.name}
                    </button>
                    <button
                      type="button"
                      className="admin-icon admin-icon--danger"
                      onClick={() => setConfirming(van.id)}
                      aria-label={`Delete ${van.name}`}
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
