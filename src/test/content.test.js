// Contract: each section's content file keeps the shape its component
// renders. Rewriting copy for a new client is fine; breaking the shape
// (a missing key, an object where an array is expected) fails here.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { hero } from '../content/hero.js'
import { stats } from '../content/stats.js'
import { services } from '../content/services.js'
import { howItWorks } from '../content/howItWorks.js'
import { testimonials } from '../content/testimonials.js'
import { faq } from '../content/faq.js'
import { legal } from '../content/legal.js'
import { video } from '../content/video.js'
import { why } from '../content/why.js'
import { tour } from '../content/tour.js'
import { contactSection } from '../content/contact.js'
import { contactCta } from '../content/cta.js'
import { gallery } from '../content/gallery.js'
import { site } from '../config/site.config.js'

describe('content — section copy contract', () => {
  it('hero has headline lines and a primary CTA', () => {
    expect(hero.headline.length).toBeGreaterThan(0)
    for (const line of hero.headline) {
      expect(line.lead).toBeTruthy()
      expect(line.accent).toBeTruthy()
    }
    expect(hero.primaryCta.label).toBeTruthy()
    expect(hero.primaryCta.to).toBeTruthy()
  })

  it('stats is a non-empty array of { value, label }', () => {
    expect(stats.length).toBeGreaterThan(0)
    for (const stat of stats) {
      expect(stat.value).toBeTruthy()
      expect(stat.label).toBeTruthy()
    }
  })

  it('services has items with icon, title and body', () => {
    expect(services.items.length).toBeGreaterThan(0)
    for (const item of services.items) {
      expect(item.icon).toBeTruthy()
      expect(item.title).toBeTruthy()
      expect(item.body).toBeTruthy()
    }
  })

  it('howItWorks has numbered, titled steps', () => {
    expect(howItWorks.steps.length).toBeGreaterThan(0)
    for (const step of howItWorks.steps) {
      expect(step.number).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.body).toBeTruthy()
    }
  })

  it('testimonials has quotes with an author', () => {
    expect(testimonials.items.length).toBeGreaterThan(0)
    for (const item of testimonials.items) {
      expect(item.quote).toBeTruthy()
      expect(item.author).toBeTruthy()
    }
  })

  it('faq has question / answer pairs', () => {
    expect(faq.items.length).toBeGreaterThan(0)
    for (const item of faq.items) {
      expect(item.q).toBeTruthy()
      expect(item.a).toBeTruthy()
    }
  })

  it('video has a YouTube id, an accessible title and a heading', () => {
    expect(video.youtubeId).toMatch(/^[\w-]{11}$/)
    expect(video.title).toBeTruthy()
    expect(video.heading).toBeTruthy()
  })

  it('why carries its own video block for the Tough Test band', () => {
    expect(why.video.youtubeId).toMatch(/^[\w-]{11}$/)
    expect(why.video.title).toBeTruthy()
    expect(why.video.heading).toBeTruthy()
  })

  it('tour has a Kuula embed URL, an accessible title and a poster', () => {
    expect(tour.src).toContain('https://kuula.co/share/')
    expect(tour.title).toBeTruthy()
    expect(tour.heading).toBeTruthy()
    expect(tour.launchLabel).toBeTruthy()
    expect(tour.poster).toMatch(/^\/images\//)
  })

  it('tour has hero copy for the dedicated /360 page', () => {
    expect(tour.page.eyebrow).toBeTruthy()
    expect(tour.page.heading).toBeTruthy()
    expect(tour.page.sub).toBeTruthy()
  })

  it('contact has a heading, form copy and an embeddable map', () => {
    expect(contactSection.heading).toBeTruthy()
    expect(contactSection.formTitle).toBeTruthy()
    expect(contactSection.formSub).toBeTruthy()
    expect(contactSection.submitLabel).toBeTruthy()
    expect(site.contact.mapEmbedUrl).toContain('output=embed')
  })

  it('cta band points at the contact page', () => {
    expect(contactCta.heading).toBeTruthy()
    expect(contactCta.body).toBeTruthy()
    expect(contactCta.cta.label).toBeTruthy()
    expect(contactCta.cta.to).toBe('/contact')
  })

  it('legal has privacy and terms, each with sections', () => {
    for (const doc of [legal.privacy, legal.terms]) {
      expect(doc.title).toBeTruthy()
      expect(doc.sections.length).toBeGreaterThan(0)
      for (const section of doc.sections) {
        expect(section.heading).toBeTruthy()
        expect(section.body).toBeTruthy()
      }
    }
  })
})

describe('gallery — collection grouping contract', () => {
  const collections = ['interiors', 'exteriors', 'page']

  it('every item has a src under /images and non-empty alt text', () => {
    for (const name of collections) {
      for (const item of gallery[name].items) {
        expect(item.src, `${name}: ${item.src}`).toMatch(/^\/images\/[\w.-]+$/)
        expect(item.alt, `${name}: ${item.src}`).toBeTruthy()
      }
    }
  })

  it('no collection repeats a photo', () => {
    for (const name of collections) {
      const srcs = gallery[name].items.map((i) => i.src)
      expect(new Set(srcs).size, `${name} has a duplicate src`).toBe(srcs.length)
    }
  })

  // Both render on /gallery, one above the other, so an overlap shows the
  // same van twice on a single screen.
  it('the exteriors band and the page mosaic share no photo', () => {
    const band = new Set(gallery.exteriors.items.map((i) => i.src))
    const overlap = gallery.page.items.map((i) => i.src).filter((src) => band.has(src))
    expect(overlap).toEqual([])
  })

  // Deleting a photo without unlinking it here leaves a broken tile that only
  // shows up in the browser, so check the files are actually on disk.
  it('every photo resolves to a file in public/images', () => {
    for (const name of collections) {
      for (const item of gallery[name].items) {
        expect(existsSync(join('public', item.src)), `${name}: ${item.src} is missing`).toBe(true)
      }
    }
  })
})
