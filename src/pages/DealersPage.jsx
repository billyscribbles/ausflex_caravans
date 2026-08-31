import { motion } from 'framer-motion'
import SEO from '../lib/seo.jsx'
import ContactCTA from '../components/ContactCTA.jsx'
import { dealersPage } from '../content/dealers.js'
import { useScrollIn } from '../lib/motion.js'
import './DealersPage.css'

export default function DealersPage() {
  const scrollIn = useScrollIn()
  return (
    <main>
      <SEO
        title="Dealers"
        description="Find an Ausflex dealer near you — Sunrise Caravans in Burpengary East QLD and Rugged Kiwi Caravans in Hamilton NZ — or buy direct from the factory in Campbellfield."
        path="/dealers"
      />

      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">{dealersPage.eyebrow}</span>
          <h1 className="page-hero__title">{dealersPage.heading}</h1>
          <p className="page-hero__sub">{dealersPage.intro}</p>
        </div>
      </header>

      <section className="dealers-page section">
        <div className="container">
          <ul className="dealers-page__grid">
            {dealersPage.dealers.map((d, i) => (
              <motion.li key={d.name} className="dealers-page__card" {...scrollIn(i)}>
                <span className="section-eyebrow">{d.region}</span>
                <h2 className="dealers-page__name">{d.name}</h2>
                <p className="dealers-page__blurb">{d.blurb}</p>
                <dl className="dealers-page__details">
                  <div className="dealers-page__detail">
                    <dt>Address</dt>
                    <dd>
                      <a href={d.mapUrl} target="_blank" rel="noopener noreferrer">
                        {d.address}
                      </a>
                    </dd>
                  </div>
                  <div className="dealers-page__detail">
                    <dt>Phone</dt>
                    <dd>
                      <a href={d.phone.href}>{d.phone.label}</a>
                    </dd>
                  </div>
                  <div className="dealers-page__detail">
                    <dt>Website</dt>
                    <dd>
                      <a href={d.website.href} target="_blank" rel="noopener noreferrer">
                        {d.website.label}
                      </a>
                    </dd>
                  </div>
                </dl>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      <ContactCTA />
    </main>
  )
}
