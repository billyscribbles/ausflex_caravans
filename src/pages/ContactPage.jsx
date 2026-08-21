import SEO from '../lib/seo.jsx'
import Contact from '../components/Contact.jsx'
import './ContactPage.css'

export default function ContactPage() {
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

      <Contact />
    </main>
  )
}
