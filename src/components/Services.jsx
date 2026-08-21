import { motion } from 'framer-motion'
import { MapPin, ShieldCheck, Wrench, Mountain } from 'lucide-react'
import { services } from '../content/services.js'
import { useScrollIn } from '../lib/motion.js'
import './Services.css'

const ICONS = { MapPin, ShieldCheck, Wrench, Mountain }

export default function Services() {
  const scrollIn = useScrollIn()
  return (
    <section className="services section section--dark">
      <div className="container">
        <div className="services__head">
          {services.eyebrow && <span className="section-eyebrow">{services.eyebrow}</span>}
          <h2 className="section-label">{services.heading}</h2>
          {services.sub && <p className="section-sub">{services.sub}</p>}
        </div>

        <div className="services__grid">
          {services.items.map((item, i) => {
            const Icon = ICONS[item.icon] || ShieldCheck
            return (
              <motion.div key={item.title} className="services__pillar" {...scrollIn(i)}>
                <div className="services__icon">
                  <Icon size={24} strokeWidth={1.6} />
                </div>
                <h3 className="services__title">{item.title}</h3>
                <p className="services__body">{item.body}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
