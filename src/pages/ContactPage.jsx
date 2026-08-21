import { MapPin, Clock, Phone, Mail } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import { site } from '../config/site.config.js'
import Contact from '../components/Contact.jsx'
import './ContactPage.css'

export default function ContactPage() {
  const { contact } = site
  return (
    <main>
      <SEO
        title="Contact"
        description="Talk to Ausflex Caravans about your next van. Visit us at 27 Metrolink Cct, Campbellfield VIC, call 0451 712 116 or send an enquiry online."
        path="/contact"
      />

      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">Contact us</span>
          <h1 className="page-hero__title">Let’s talk caravans.</h1>
          <p className="page-hero__sub">
            Each Ausflex is meticulously crafted, with attention to every detail. Contact us today
            to discuss your dream caravan.
          </p>
        </div>
      </header>

      <section className="contact-info">
        <div className="container contact-info__grid">
          <div className="contact-info__item">
            <MapPin size={20} strokeWidth={1.8} aria-hidden="true" />
            <h2>Our location</h2>
            <p>
              <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">
                {contact.location}
              </a>
            </p>
          </div>
          <div className="contact-info__item">
            <Clock size={20} strokeWidth={1.8} aria-hidden="true" />
            <h2>Our hours</h2>
            <p>
              {contact.hours.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </p>
          </div>
          <div className="contact-info__item">
            <Phone size={20} strokeWidth={1.8} aria-hidden="true" />
            <h2>Call us</h2>
            <p>
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
            </p>
          </div>
          <div className="contact-info__item">
            <Mail size={20} strokeWidth={1.8} aria-hidden="true" />
            <h2>Email us</h2>
            <p>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </p>
          </div>
        </div>
      </section>

      <Contact />
    </main>
  )
}
