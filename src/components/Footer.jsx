import { Link } from 'react-router-dom'
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react'
import { site } from '../config/site.config.js'
import './Footer.css'

export default function Footer() {
  const { brand, footer, social, contact } = site

  return (
    <footer className="footer">
      <div className="footer__main">
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

        {footer.columns.map((col) => (
          <div key={col.title}>
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
          </div>
        ))}

        <div>
          <div className="footer__col-title">Contact</div>
          <div className="footer__contact-info">
            {contact.location && <span className="footer__location">{contact.location}</span>}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="footer__phone">
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="footer__email">
                {contact.email}
              </a>
            )}
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
      </div>

      <div className="footer__bottom">
        <span className="footer__copyright">{footer.copyright}</span>
        <span className="footer__credit">
          site by{' '}
          <a
            href="https://www.onraistudio.com"
            className="footer__credit-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Onrai Studio
          </a>
        </span>
        <div className="footer__legal">
          <Link to="/privacy" className="footer__legal-btn">
            Privacy
          </Link>
          <Link to="/terms" className="footer__legal-btn">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}
