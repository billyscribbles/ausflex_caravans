import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { site } from '../config/site.config.js'
import { contactCta } from '../content/cta.js'
import { useScrollIn } from '../lib/motion.js'
import './ContactCTA.css'

// Closing band for every page except /contact: the enquiry pitch and a single
// link through to the contact page. The form and the map live there only.
//
// Cinematic rather than a cream footer-lead-in — a full-bleed factory frame
// under a scrim, the closing statement in the hero's voice, then the direct
// lines and the CTA sharing one row on a bronze rule.
export default function ContactCTA() {
  const scrollIn = useScrollIn()
  const { contact } = site

  return (
    <section className="cta">
      {contactCta.image && (
        <div className="cta__figure" aria-hidden="true">
          <img src={contactCta.image} alt="" loading="lazy" />
          <span className="cta__scrim" />
        </div>
      )}

      <div className="container cta__content">
        <motion.div className="cta__head" {...scrollIn(0)}>
          {contactCta.eyebrow && <span className="section-eyebrow">{contactCta.eyebrow}</span>}
          <h2 className="display-statement cta__heading">
            {contactCta.heading} {contactCta.headingAccent && <em>{contactCta.headingAccent}</em>}
          </h2>
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
