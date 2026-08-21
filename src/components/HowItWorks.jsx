import { motion } from 'framer-motion'
import { howItWorks } from '../content/howItWorks.js'
import { useScrollIn } from '../lib/motion.js'
import './HowItWorks.css'

export default function HowItWorks() {
  const scrollIn = useScrollIn()
  return (
    <section className="hiw section section--dark" id="process">
      <div className="container hiw__grid">
        <div className="hiw__head">
          {howItWorks.eyebrow && <span className="section-eyebrow">{howItWorks.eyebrow}</span>}
          <h2 className="section-label hiw__heading">{howItWorks.heading}</h2>
          {howItWorks.sub && <p className="hiw__sub">{howItWorks.sub}</p>}
        </div>

        <div className="hiw__steps">
          {howItWorks.steps.map((step, i) => (
            <motion.div key={step.number} className="hiw__step" {...scrollIn(i)}>
              <div className="hiw__number">{step.number}</div>
              <h3 className="hiw__title">{step.title}</h3>
              <p className="hiw__body">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
