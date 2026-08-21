import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import Login from '../admin/Login.jsx'
import { getSession, getContent, logout } from '../admin/api.js'
import '../admin/admin.css'

const TABS = [
  { id: 'photos', label: 'Photos' },
  { id: 'tours', label: '360 Tours' },
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(null)
  const [tab, setTab] = useState('photos')
  const [content, setContent] = useState(null)

  const refresh = useCallback(async () => {
    setContent(await getContent())
  }, [])

  useEffect(() => {
    getSession()
      .then((s) => setAuthed(s.authed))
      .catch(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (authed) refresh()
  }, [authed, refresh])

  return (
    <>
      <Helmet>
        <title>Admin · Ausflex Caravans</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="admin">
        {authed === null && <p className="admin-status">Loading…</p>}

        {authed === false && <Login onSuccess={() => setAuthed(true)} />}

        {authed === true && (
          <>
            <header className="admin-header">
              <h1 className="admin-header__title">Ausflex admin</h1>
              <button
                className="admin-button admin-button--quiet"
                type="button"
                onClick={async () => {
                  await logout()
                  setAuthed(false)
                }}
              >
                Sign out
              </button>
            </header>

            <div className="admin-tabs" role="tablist" aria-label="Admin sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  className={`admin-tab${tab === t.id ? ' admin-tab--active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {TABS.map((t) => (
              <div
                key={t.id}
                role="tabpanel"
                id={`panel-${t.id}`}
                aria-labelledby={`tab-${t.id}`}
                hidden={tab !== t.id}
              >
                {tab === t.id && content && (
                  <p className="admin-status">Coming in the next task.</p>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </>
  )
}
