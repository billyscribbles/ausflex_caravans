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

  const { brand, nav, cta } = site

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
            <Link key={l.to} to={l.to} className="navbar__link">
              {l.label}
            </Link>
          ))}
          {cta && (
            <Link to={cta.to}>
              <button className="navbar__cta">{cta.label}</button>
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

      <nav className={`navbar__mobile${menuOpen ? ' open' : ''}`} aria-label="Mobile navigation">
        {nav.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="navbar__mobile-link"
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        {cta && (
          <Link to={cta.to} onClick={() => setMenuOpen(false)}>
            <button className="navbar__mobile-cta">{cta.label}</button>
          </Link>
        )}
      </nav>
    </header>
  )
}
