import { useState } from 'react'
import { ArrowRight, Facebook, Instagram } from 'lucide-react'
import TikTokIcon from './TikTokIcon.jsx'
import { site } from '../config/site.config.js'
import { contactSection } from '../content/contact.js'
import './Contact.css'

export default function Contact() {
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [mapLive, setMapLive] = useState(false)
  const formspreeId = site.integrations.formspreeId

  async function handleSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    // Honeypot: real users never see or fill this field — bots do.
    if (form.elements._gotcha?.value) return
    if (!formspreeId) {
      setStatus('error')
      return
    }
    setStatus('submitting')
    const data = new FormData(form)
    try {
      const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setStatus('success')
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const { contact, social } = site

  return (
    <section className="contact section" id="contact">
      <div className="container contact__inner">
        <div className="contact__head">
          <span className="section-eyebrow">{contactSection.eyebrow}</span>
          <h2 className="section-label contact__heading">{contactSection.heading}</h2>
          <p className="contact__sub">{contactSection.sub}</p>
        </div>

        <dl className="contact__details">
          {contact.phone && (
            <div className="contact__detail">
              <dt>Call us</dt>
              <dd>
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
              </dd>
              {contact.hours?.map((line) => (
                <dd key={line}>{line}</dd>
              ))}
            </div>
          )}
          {contact.location && (
            <div className="contact__detail">
              <dt>Our location</dt>
              <dd>
                <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">
                  {contact.location}
                </a>
              </dd>
            </div>
          )}
          {contact.email && (
            <div className="contact__detail">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </dd>
            </div>
          )}
          {(social.facebook || social.instagram || social.tiktok) && (
            <div className="contact__detail">
              <dt>Follow us</dt>
              <dd className="contact__socials">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <Facebook size={17} strokeWidth={1.8} />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <Instagram size={17} strokeWidth={1.8} />
                  </a>
                )}
                {social.tiktok && (
                  <a
                    href={social.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                  >
                    <TikTokIcon size={17} />
                  </a>
                )}
              </dd>
            </div>
          )}
        </dl>

        <form className="contact__form" onSubmit={handleSubmit}>
          <div className="contact__form-head">
            {contactSection.formTitle && <h3>{contactSection.formTitle}</h3>}
            {contactSection.formSub && <p>{contactSection.formSub}</p>}
          </div>

          <label className="contact__field">
            <span>Name</span>
            <input type="text" name="name" autoComplete="name" required />
          </label>
          <label className="contact__field">
            <span>Email</span>
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label className="contact__field">
            <span>Phone (optional)</span>
            <input type="tel" name="phone" autoComplete="tel" />
          </label>
          <label className="contact__field">
            <span>Message</span>
            <textarea
              name="message"
              rows="4"
              required
              placeholder="Tell us what you are looking for…"
            />
          </label>

          {/* Honeypot — visually hidden, labelled for AT, ignored by Formspree
              when filled. Bots that fill every field get caught here. */}
          <label className="contact__honeypot">
            Leave this field empty
            <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
          </label>

          <button type="submit" className="contact__submit" disabled={status === 'submitting'}>
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            {status === 'submitting' ? 'Sending…' : contactSection.submitLabel}
          </button>

          {/* Always-present live region so success/error is announced to AT. */}
          <p className="contact__status" role="status" aria-live="polite">
            {status === 'success' && (
              <span className="contact__status--success">{contactSection.successMessage}</span>
            )}
            {status === 'error' && (
              <span className="contact__status--error">
                Something went wrong. Email us directly at {site.contact.email}.
              </span>
            )}
          </p>
        </form>

        {contact.mapEmbedUrl && (
          <div className="contact__map">
            <iframe
              src={contact.mapEmbedUrl}
              title={`Map showing ${contact.location}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            {/* Google's embed takes the vertical drag a phone scrolls with, so
                a thumb landing on the map pans it instead of moving the page.
                The shield absorbs that first touch and hands the map over on a
                tap. CSS drops it on pointer devices, where the map has always
                been directly usable. */}
            {!mapLive && (
              <button
                type="button"
                className="contact__map-shield"
                onClick={() => setMapLive(true)}
              >
                <span>Tap to use the map</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
