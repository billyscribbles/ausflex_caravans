import { useState } from 'react'
import { site } from '../config/site.config.js'
import { contactSection } from '../content/contact.js'
import './Contact.css'

export default function Contact() {
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
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

  return (
    <section className="contact section" id="contact">
      <div className="container contact__inner">
        <div className="contact__head">
          <span className="section-eyebrow">{contactSection.eyebrow}</span>
          <h2 className="section-label">{contactSection.heading}</h2>
          <p className="section-sub">{contactSection.sub}</p>
        </div>

        <form className="contact__form" onSubmit={handleSubmit}>
          <div className="contact__row">
            <label className="contact__field">
              <span>Name</span>
              <input type="text" name="name" autoComplete="name" required />
            </label>
            <label className="contact__field">
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>
          </div>
          <label className="contact__field">
            <span>Phone (optional)</span>
            <input type="tel" name="phone" autoComplete="tel" />
          </label>
          <label className="contact__field">
            <span>Message</span>
            <textarea
              name="message"
              rows="5"
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
            {status === 'submitting' ? 'Sending…' : `${contactSection.submitLabel} →`}
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
      </div>
    </section>
  )
}
