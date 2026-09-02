import { motion } from 'framer-motion'
import SEO from '../lib/seo.jsx'
import ContactCTA from '../components/ContactCTA.jsx'
import { dealersPage } from '../content/dealers.js'
import { useScrollIn } from '../lib/motion.js'
import './DealersPage.css'

const external = { target: '_blank', rel: 'noopener noreferrer' }

// A dealer's detail rows in display order. Only the phone is guaranteed: a
// fixed dealer has an address and a website, the mobile dealer has a location
// line and an email, so each row is included only when its field is present.
function dealerDetails(d) {
  return [
    d.address && {
      label: 'Address',
      value: (
        <a href={d.mapUrl} {...external}>
          {d.address}
        </a>
      ),
    },
    !d.address && d.location && { label: 'Where', value: d.location },
    { label: 'Phone', value: <a href={d.phone.href}>{d.phone.label}</a> },
    d.email && { label: 'Email', value: <a href={d.email.href}>{d.email.label}</a> },
    d.website && {
      label: 'Website',
      value: (
        <a href={d.website.href} {...external}>
          {d.website.label}
        </a>
      ),
    },
  ].filter(Boolean)
}

export default function DealersPage() {
  const scrollIn = useScrollIn()
  return (
    <main>
      <SEO
        title="Dealers"
        description="Find an Ausflex dealer — Sunrise Caravans in Burpengary East QLD, Rugged Kiwi Caravans in Hamilton NZ, or our mobile dealer Australia wide — or buy direct from the factory in Campbellfield."
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
                  {dealerDetails(d).map((row) => (
                    <div key={row.label} className="dealers-page__detail">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
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
