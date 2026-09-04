import { Link } from 'react-router-dom'
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react'
import TikTokIcon from './TikTokIcon.jsx'
import { site } from '../config/site.config.js'
import { useVans } from '../lib/contentStore.js'
import { vanLinks } from '../lib/vanLinks.js'
import './Footer.css'

// One block: the mark, the site map and the way to reach a human across a
// single row, then one legal line. The upgrades over the old footer are scale
// and air — a larger mark, contact set as readable copy rather than more mono
// micro-type, and a two-group bottom row instead of three.
export default function Footer() {
  const { brand, footer, social, contact } = site
  const { vans } = useVans()

  // A column declaring `source` is filled from live content rather than from
  // its own list in site.config, so the range here is whatever the dashboard
  // currently holds. Empty columns drop out instead of leaving a bare heading.
  const columns = footer.columns
    .map((col) => (col.source === 'vans' ? { ...col, links: vanLinks(vans.items) } : col))
    .filter((col) => col.links?.length)

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__logo">
            {brand.logoSrc ? (
              <img src={brand.logoSrc} alt={brand.name} className="footer__logo-img" />
            ) : (
              <>
                {brand.logoText}
                <span className="footer__logo-dot" aria-hidden="true" />
              </>
            )}
          </div>
          <p className="footer__tagline">{brand.tagline}</p>
        </div>

        {columns.map((col) => (
          <nav key={col.title} className="footer__group" aria-label={col.title}>
            <div className="footer__col-title">{col.title}</div>
            <ul className="footer__links">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="footer__link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="footer__contact">
          <div className="footer__col-title">Visit or call</div>
          {contact.location && <p className="footer__location">{contact.location}</p>}
          <div className="footer__lines">
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="footer__phone">
                {contact.phone}
              </a>
            )}
            {contact.phoneAlt && (
              <a href={`tel:${contact.phoneAlt.replace(/\s/g, '')}`} className="footer__phone">
                {contact.phoneAlt}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="footer__email">
                {contact.email}
              </a>
            )}
          </div>
          <div className="footer__socials">
            {social.facebook && (
              <a
                href={social.facebook}
                className="footer__social"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <Facebook size={18} strokeWidth={1.8} />
              </a>
            )}
            {social.linkedin && (
              <a
                href={social.linkedin}
                className="footer__social"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} strokeWidth={1.8} />
              </a>
            )}
            {social.instagram && (
              <a
                href={social.instagram}
                className="footer__social"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Instagram size={18} strokeWidth={1.8} />
              </a>
            )}
            {social.tiktok && (
              <a
                href={social.tiktok}
                className="footer__social"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <TikTokIcon size={18} />
              </a>
            )}
            {social.twitter && (
              <a
                href={social.twitter}
                className="footer__social"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
              >
                <Twitter size={18} strokeWidth={1.8} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        {/* Inner row carries the rule, so it starts on the same left edge as
         * the columns above rather than out in the gutter. */}
        <div className="footer__bottom-row">
          <span className="footer__copyright">{footer.copyright}</span>
          <div className="footer__legal">
            <Link to="/privacy" className="footer__legal-btn">
              Privacy
            </Link>
            <Link to="/terms" className="footer__legal-btn">
              Terms
            </Link>
            <span className="footer__credit">
              <a
                href="https://onraistudio.com/"
                className="footer__credit-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Site by Onrai Studio
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
