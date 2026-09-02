import { useState, useEffect, useId, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { site } from '../config/site.config.js'
import { useVans } from '../lib/contentStore.js'
import { vanLinks } from '../lib/vanLinks.js'
import './Navbar.css'

// A nav item that owns a dropdown. The label stays a plain link to the section
// index and the caret beside it is the toggle, so the item works for a mouse
// (hover the row), a thumb (tap the caret) and a keyboard (tab to the caret,
// Enter) without any of the three losing the index. Nesting a <button> inside
// the <Link>, or making the label itself the toggle, would cost it that link.
function NavMenu({ item, links, current }) {
  // Hover and the caret are two ways into the same panel, kept as separate
  // facts so they cannot cancel each other out: a mouse user who hovers the
  // item open and then clicks the caret would otherwise close it on the way in.
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || pinned
  const panelId = useId()
  const toggleRef = useRef(null)
  const setOpen = (next) => {
    setHovered(next)
    setPinned(next)
  }

  // Pointer events rather than mouse events, filtered to real hovering
  // devices. A tap emits an emulated mouseenter that never gets a matching
  // leave, which would wedge the panel open on a touchscreen.
  const onPointerEnter = (e) => {
    if (e.pointerType === 'mouse') setHovered(true)
  }
  const onPointerLeave = (e) => {
    if (e.pointerType === 'mouse') setOpen(false)
  }

  // Escape closes and hands focus back to the caret, so a keyboard user who
  // opened the panel is not dropped on the body. The panel is `hidden` rather
  // than clipped, so its links leave the tab order with it.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="navbar__item" onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <Link to={item.to} className="navbar__link" aria-current={current(item.to)}>
        {item.label}
      </Link>
      <button
        ref={toggleRef}
        type="button"
        className="navbar__caret"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${item.label} — show the range`}
        onClick={() => setPinned(!open)}
      >
        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
      </button>

      <div className="navbar__menu" id={panelId} hidden={!open}>
        <ul className="navbar__menu-list">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="navbar__menu-link"
                aria-current={current(l.to)}
                onClick={() => setOpen(false)}
              >
                <span className="navbar__menu-name">{l.name}</span>
                {l.length && <span className="navbar__menu-length">{l.length}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSub, setOpenSub] = useState(null)
  const { pathname } = useLocation()
  const { vans } = useVans()
  const subId = useId()

  useEffect(() => {
    setMenuOpen(false)
    setOpenSub(null)
  }, [pathname])

  // Escape closes the panel. Tapping outside it already did — the hamburger is
  // the only thing that reopens it — but a keyboard user who tabbed in had no
  // way out except tabbing through every link.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const { brand, nav, cta } = site

  // Live submenus, keyed by the `menu` field a nav item opts in with. Only the
  // range needs one today; the lookup keeps the next one a config edit.
  const submenus = { vans: vanLinks(vans.items) }
  const linksFor = (item) => (item.menu ? (submenus[item.menu] ?? []) : [])

  // "/" only matches itself; every other entry also owns its children, so
  // /vans/extreme-family still marks "Our vans" as the current page. Van links
  // inside a dropdown are exact — the parent already carries the section.
  const isCurrent = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to))
  const current = (to) => (isCurrent(to) ? 'page' : undefined)
  const currentExact = (to) => (pathname === to ? 'page' : undefined)

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo" aria-label={brand.name}>
          {brand.logoSrc ? (
            <img src={brand.logoSrc} alt={brand.name} className="navbar__logo-img" />
          ) : (
            <>
              {brand.logoText}
              <span className="navbar__logo-dot" aria-hidden="true" />
            </>
          )}
        </Link>

        <nav className="navbar__links" aria-label="Main navigation">
          {nav.map((l) => {
            const links = linksFor(l)
            // No vans yet, or every one still unslugged: the item stays the
            // plain link it was rather than offering an empty panel.
            return links.length ? (
              <NavMenu
                key={l.to}
                item={l}
                links={links}
                current={(to) => (to === l.to ? current(to) : currentExact(to))}
              />
            ) : (
              <Link key={l.to} to={l.to} className="navbar__link" aria-current={current(l.to)}>
                {l.label}
              </Link>
            )
          })}
          {/* The pill is the link itself. It used to be a <button> nested inside
              the <Link>, which is interactive content inside an anchor — invalid
              nesting, two stops in the tab order for one control, and the reason
              the mobile pill would not fill its row. */}
          {cta && (
            <Link to={cta.to} className="navbar__cta">
              {cta.label}
            </Link>
          )}
        </nav>

        <button
          className={`navbar__hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Collapsed, the panel is only clipped by max-height, so its links stay
          focusable and keyboard users tab into an invisible menu. `inert` takes
          the whole subtree out of the tab order and the accessibility tree
          without touching the height transition. React 18 needs the string
          form; a boolean warns. */}
      <nav
        className={`navbar__mobile${menuOpen ? ' open' : ''}`}
        aria-label="Mobile navigation"
        inert={menuOpen ? undefined : ''}
      >
        {nav.map((l) => {
          const links = linksFor(l)
          if (!links.length) {
            return (
              <Link
                key={l.to}
                to={l.to}
                className="navbar__mobile-link"
                aria-current={current(l.to)}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            )
          }

          // An accordion rather than the whole range inline: the panel already
          // runs most of a phone screen before the sub-rows are counted.
          const expanded = openSub === l.to
          const panelId = `${subId}-${l.to}`
          return (
            <div key={l.to} className="navbar__mobile-group">
              <div className="navbar__mobile-row">
                <Link
                  to={l.to}
                  className="navbar__mobile-link"
                  aria-current={current(l.to)}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
                <button
                  type="button"
                  className={`navbar__mobile-caret${expanded ? ' open' : ''}`}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  aria-label={`${l.label} — show the range`}
                  onClick={() => setOpenSub(expanded ? null : l.to)}
                >
                  <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              <ul className="navbar__mobile-sub" id={panelId} hidden={!expanded}>
                {links.map((sub) => (
                  <li key={sub.to}>
                    <Link
                      to={sub.to}
                      className="navbar__mobile-sublink"
                      aria-current={currentExact(sub.to)}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="navbar__mobile-subname">{sub.name}</span>
                      {sub.length && <span className="navbar__mobile-sublength">{sub.length}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {cta && (
          <Link to={cta.to} className="navbar__mobile-cta" onClick={() => setMenuOpen(false)}>
            {cta.label}
          </Link>
        )}
      </nav>
    </header>
  )
}
