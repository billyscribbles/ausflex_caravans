import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Images, Sofa, Caravan, Compass, Download, LogOut, Truck, Type } from 'lucide-react'
import Login from '../admin/Login.jsx'
import PhotosTab from '../admin/PhotosTab.jsx'
import ToursTab from '../admin/ToursTab.jsx'
import VansTab from '../admin/VansTab.jsx'
import VansPageTab from '../admin/VansPageTab.jsx'
import { getSession, getContent, logout, exportUrl, UNAUTHORISED_EVENT } from '../admin/api.js'
import '../admin/admin.css'

// The sidebar is the whole information architecture: every destination is one
// click, and each one says where on the live site it lands. The photo
// collections used to hide behind a <select> inside the panel — a dashboard
// puts them in the rail.
const NAV = [
  {
    group: 'Photos',
    items: [
      {
        id: 'page',
        label: 'Gallery page',
        icon: Images,
        kind: 'photos',
        where: 'The mosaic on /gallery.',
      },
      {
        id: 'interiors',
        label: 'Interiors rail',
        icon: Sofa,
        kind: 'photos',
        where: 'The scrolling rail on the home page.',
      },
      {
        id: 'exteriors',
        label: 'Exteriors',
        icon: Caravan,
        kind: 'photos',
        where: 'The band above the mosaic on /gallery.',
      },
    ],
  },
  {
    group: 'Tours',
    items: [
      {
        id: 'tours',
        label: '360 tours',
        icon: Compass,
        kind: 'tours',
        where: 'The /360 page, and the first tour on the home page.',
      },
    ],
  },
  {
    group: 'Range',
    items: [
      {
        id: 'vans',
        label: 'Vans',
        icon: Truck,
        kind: 'vans',
        where: 'The cards on the home page and /vans.',
      },
      {
        id: 'vans-page',
        label: 'Page intro',
        icon: Type,
        kind: 'vansPage',
        where: 'The heading above the range on /vans.',
      },
    ],
  },
]

const VIEWS = NAV.flatMap((section) => section.items)

function countFor(view, content) {
  if (!content) return null
  if (view.kind === 'tours') return content.tours.length
  if (view.kind === 'vans') return content.vans.items.length
  if (view.kind === 'vansPage') return null
  return content.gallery[view.id].length
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(null)
  const [expired, setExpired] = useState(false)
  const [viewId, setViewId] = useState('page')
  const [content, setContent] = useState(null)

  const view = VIEWS.find((v) => v.id === viewId)

  const refresh = useCallback(async () => {
    setContent(await getContent())
  }, [])

  useEffect(() => {
    getSession()
      .then((s) => setAuthed(s.authed))
      .catch(() => setAuthed(false))
  }, [])

  // Any admin call answering 401 means the session died while the dashboard
  // was open. Show the login screen — a dead-session dashboard otherwise looks
  // fully alive (see the note in admin/api.js) while every save silently fails.
  useEffect(() => {
    const onUnauthorised = () => {
      setAuthed(false)
      setExpired(true)
    }
    window.addEventListener(UNAUTHORISED_EVENT, onUnauthorised)
    return () => window.removeEventListener(UNAUTHORISED_EVENT, onUnauthorised)
  }, [])

  useEffect(() => {
    if (authed) refresh()
  }, [authed, refresh])

  const count = countFor(view, content)

  // Inactive tabs are taken out of the tab order, so the arrow keys have to
  // carry keyboard users between them — the tablist contract.
  function onNavKeyDown(event) {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
    const jump = { Home: 0, End: VIEWS.length - 1 }[event.key]
    let nextIndex = null
    if (step) {
      nextIndex = (VIEWS.findIndex((v) => v.id === viewId) + step + VIEWS.length) % VIEWS.length
    } else if (jump !== undefined) {
      nextIndex = jump
    }
    if (nextIndex === null) return
    event.preventDefault()
    const next = VIEWS[nextIndex]
    setViewId(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  return (
    <>
      <Helmet>
        <title>Admin · Ausflex Caravans</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {authed === null && (
        <main className="admin-boot">
          <p className="admin-status">Loading…</p>
        </main>
      )}

      {authed === false && (
        <Login
          onSuccess={() => {
            setAuthed(true)
            setExpired(false)
          }}
          notice={expired ? 'Your session expired — sign in again to keep working.' : null}
        />
      )}

      {authed === true && (
        <div className="admin-shell">
          <aside className="admin-rail">
            <div className="admin-rail__brand">
              <span className="admin-rail__mark">Ausflex</span>
              <span className="admin-rail__kicker">Content manager</span>
            </div>

            <div
              className="admin-rail__nav"
              role="tablist"
              aria-orientation="vertical"
              aria-label="Dashboard sections"
            >
              {NAV.map((section) => (
                <div className="admin-rail__group" key={section.group}>
                  <p className="admin-rail__group-label">{section.group}</p>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = item.id === viewId
                    const n = countFor(item, content)
                    return (
                      <button
                        key={item.id}
                        role="tab"
                        type="button"
                        id={`tab-${item.id}`}
                        aria-selected={active}
                        aria-controls="admin-panel"
                        tabIndex={active ? 0 : -1}
                        className={`admin-navitem${active ? ' admin-navitem--active' : ''}`}
                        onClick={() => setViewId(item.id)}
                        onKeyDown={onNavKeyDown}
                      >
                        <Icon className="admin-navitem__icon" size={16} aria-hidden="true" />
                        <span className="admin-navitem__label">{item.label}</span>
                        {n !== null && <span className="admin-navitem__count">{n}</span>}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="admin-rail__foot">
              <a className="admin-railaction" href={exportUrl}>
                <Download size={15} aria-hidden="true" />
                Download backup
              </a>
              <button
                className="admin-railaction"
                type="button"
                onClick={async () => {
                  await logout()
                  setAuthed(false)
                }}
              >
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </aside>

          {/* The only scrolling region. The rail stays put. */}
          <main className="admin-main">
            <header className="admin-topbar">
              <div>
                <h1 className="admin-topbar__title">{view.label}</h1>
                <p className="admin-topbar__where">{view.where}</p>
              </div>
              {count !== null && (
                <p className="admin-topbar__count">
                  {count} {view.kind === 'tours' ? 'tour' : view.kind === 'vans' ? 'van' : 'photo'}
                  {count === 1 ? '' : 's'}
                </p>
              )}
            </header>

            <div
              className="admin-panel"
              role="tabpanel"
              id="admin-panel"
              aria-labelledby={`tab-${viewId}`}
              tabIndex={-1}
            >
              {!content && <p className="admin-status">Loading content…</p>}

              {content && view.kind === 'photos' && (
                <PhotosTab
                  key={view.id}
                  collection={view.id}
                  label={view.label}
                  photos={content.gallery[view.id]}
                  onChange={refresh}
                />
              )}

              {content && view.kind === 'tours' && (
                <ToursTab tours={content.tours} onChange={refresh} />
              )}

              {content && view.kind === 'vans' && (
                <VansTab vans={content.vans} onChange={refresh} />
              )}

              {content && view.kind === 'vansPage' && (
                <VansPageTab page={content.vans} onChange={refresh} />
              )}
            </div>
          </main>
        </div>
      )}
    </>
  )
}
