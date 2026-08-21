// Contract: the two config files carry every field the components and SEO
// layer read. A swap that forgets a field should fail here, not in the browser.
import { describe, it, expect } from 'vitest'
import { site } from '../config/site.config.js'
import { theme } from '../config/theme.config.js'

describe('site.config — brand identity contract', () => {
  it('brand exposes a name and a logo (text or image)', () => {
    expect(site.brand.name).toBeTruthy()
    expect(site.brand.logoText || site.brand.logoSrc).toBeTruthy()
  })

  it('nav is a non-empty array of { label, to }', () => {
    expect(Array.isArray(site.nav)).toBe(true)
    expect(site.nav.length).toBeGreaterThan(0)
    for (const item of site.nav) {
      expect(item.label).toBeTruthy()
      expect(item.to).toBeTruthy()
    }
  })

  it('footer has columns and a copyright line', () => {
    expect(Array.isArray(site.footer.columns)).toBe(true)
    expect(site.footer.copyright).toBeTruthy()
  })

  it('seo carries every field the Helmet layer reads', () => {
    for (const key of ['defaultTitle', 'titleTemplate', 'description', 'siteUrl', 'ogImage']) {
      expect(site.seo[key], `seo.${key}`).toBeTruthy()
    }
  })

  it('contact exposes an email address', () => {
    expect(site.contact.email).toBeTruthy()
  })

  it('integrations keys exist (values may be empty until env is set)', () => {
    expect(site.integrations).toHaveProperty('formspreeId')
    expect(site.integrations).toHaveProperty('gaId')
  })
})

describe('theme.config — design token contract', () => {
  it('exposes all five token groups, each non-empty', () => {
    for (const group of ['colors', 'fonts', 'radii', 'shadows', 'transitions']) {
      expect(theme[group], group).toBeTruthy()
      expect(Object.keys(theme[group]).length, group).toBeGreaterThan(0)
    }
  })

  it('defines the accent color the UI is built around', () => {
    expect(theme.colors.accent).toBeTruthy()
  })
})
