import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { site } from '../config/site.config.js'
import './Navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setMenuOpen(false)
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

  // "/" only matches itself; every other entry also owns its children, so
  // /vans/extreme-family still marks "Our vans" as the current page.
  const isCurrent = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

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
          {nav.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="navbar__link"
              aria-current={isCurrent(l.to) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
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
        {nav.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="navbar__mobile-link"
            aria-current={isCurrent(l.to) ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        {cta && (
          <Link to={cta.to} className="navbar__mobile-cta" onClick={() => setMenuOpen(false)}>
            {cta.label}
          </Link>
        )}
      </nav>
    </header>
  )
}
