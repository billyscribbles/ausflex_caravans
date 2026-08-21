import { motion } from 'framer-motion'
import { howItWorks } from '../content/howItWorks.js'
import { useScrollIn } from '../lib/motion.js'
import './HowItWorks.css'

// Four-step sequence on ink. The head runs the full width above the steps
// rather than beside them, so all four numerals sit on one line and the
// section reads as a sequence instead of a 2x2 of loose blocks.
export default function HowItWorks() {
  const scrollIn = useScrollIn()
  return (
    <section className="hiw section section--dark" id="process">
      <div className="container">
        <div className="hiw__head">
          <span className="ghost-word" aria-hidden="true">
            Process
          </span>
          <div className="hiw__head-main">
            {howItWorks.eyebrow && <span className="section-eyebrow">{howItWorks.eyebrow}</span>}
            <h2 className="section-label hiw__heading">{howItWorks.heading}</h2>
          </div>
          {howItWorks.sub && <p className="hiw__sub">{howItWorks.sub}</p>}
        </div>

        <ol className="hiw__steps">
          {howItWorks.steps.map((step, i) => (
            <motion.li key={step.number} className="hiw__step" {...scrollIn(i)}>
              <span className="numeral hiw__number" aria-hidden="true">
                {step.number}
              </span>
              <h3 className="hiw__title">{step.title}</h3>
              <p className="hiw__body">{step.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
