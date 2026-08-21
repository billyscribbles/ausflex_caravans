import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { site } from '../config/site.config.js'
import { contactCta } from '../content/cta.js'
import { useScrollIn } from '../lib/motion.js'
import './ContactCTA.css'

// Closing band for every page except /contact: the enquiry pitch and a single
// link through to the contact page. The form and the map live there only.
// Statement head, one full-width rule, then body + direct lines + CTA sharing
// the row beneath it — the band reads edge to edge rather than as two islands.
export default function ContactCTA() {
  const scrollIn = useScrollIn()
  const { contact } = site

  return (
    <section className="cta section">
      <div className="container">
        <motion.div className="cta__head" {...scrollIn(0)}>
          {contactCta.eyebrow && <span className="section-eyebrow">{contactCta.eyebrow}</span>}
          <h2 className="section-label cta__heading">{contactCta.heading}</h2>
        </motion.div>

        <motion.div className="cta__row" {...scrollIn(1)}>
          <p className="cta__body">{contactCta.body}</p>

          <dl className="cta__direct">
            {contact.phone && (
              <div className="cta__detail">
                <dt>Call us</dt>
                <dd>
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
                </dd>
              </div>
            )}
            {contact.email && (
              <div className="cta__detail">
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </dd>
              </div>
            )}
          </dl>

          <Link to={contactCta.cta.to} className="cta__button">
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            {contactCta.cta.label}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
