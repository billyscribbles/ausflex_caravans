import SEO from '../lib/seo.jsx'
import Contact from '../components/Contact.jsx'
import './ContactPage.css'

export default function ContactPage() {
  return (
    <main>
      <SEO
        title="Contact"
        description="Come and see the Ausflex range in person at 1/27 Metrolink Cct, Campbellfield VIC, then spec your own van — layout, finishes and features. Call 0451 712 116 or send us a message."
        path="/contact"
      />

      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">Visit us</span>
          <h1 className="page-hero__title">Come in and build your own.</h1>
          <p className="page-hero__sub">
            The whole range in one place, and a team who will change any of it to suit you. Call in
            for a look through, or send us a message below and we will set the vans aside.
          </p>
        </div>
      </header>

      <Contact />
    </main>
  )
}
