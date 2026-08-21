import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { hero } from '../content/hero.js'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero" id="hero">
      {hero.image && (
        <div className="hero__figure">
          <img
            className="hero__image"
            src={hero.image}
            srcSet={hero.imageSrcset}
            sizes={hero.imageSrcset ? hero.imageSizes || '100vw' : undefined}
            alt={hero.imageAlt || ''}
            fetchpriority="high"
          />
        </div>
      )}
      <div className="hero__scrim" aria-hidden="true" />

      <div className="container hero__content">
        <div className="hero__main">
          {hero.eyebrow && (
            <span className="hero__eyebrow hero__fade-up" style={{ animationDelay: '0s' }}>
              {hero.eyebrow}
            </span>
          )}

          <h1 className="hero__headline hero__fade-up" style={{ animationDelay: '0.06s' }}>
            {hero.headline.map((line) => (
              <span key={line.accent} className="hero__headline-line">
                {line.lead} <span className="hero__headline-accent">{line.accent}</span>
              </span>
            ))}
          </h1>

          <p className="hero__subheadline hero__fade-up" style={{ animationDelay: '0.14s' }}>
            {hero.subheadline}
          </p>

          <div className="hero__ctas hero__fade-up" style={{ animationDelay: '0.22s' }}>
            {hero.primaryCta && (
              <Link to={hero.primaryCta.to} className="hero__cta-primary">
                {hero.primaryCta.label}
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            )}
            {hero.secondaryCta && (
              <Link to={hero.secondaryCta.to} className="hero__cta-secondary">
                {hero.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>

        {hero.aside && (
          <p className="hero__aside hero__fade-up" style={{ animationDelay: '0.32s' }}>
            {hero.aside}
          </p>
        )}
      </div>
    </section>
  )
}
