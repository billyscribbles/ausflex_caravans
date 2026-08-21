// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  isValidEmbedUrl,
  extForMime,
  MAX_UPLOAD_BYTES,
  isValidSlug,
  slugify,
  uniqueSlug,
  validateVanPatch,
} from './validate.js'

describe('isValidEmbedUrl', () => {
  it('accepts the vendors we embed', () => {
    expect(isValidEmbedUrl('https://kuula.co/share/collection/7T3NS?fs=1')).toBe(true)
    expect(isValidEmbedUrl('https://my.matterport.com/show/?m=abc')).toBe(true)
  })

  it('rejects script and data URLs', () => {
    // This value lands in an <iframe src>, so these are the cases that matter.
    expect(isValidEmbedUrl('javascript:alert(1)')).toBe(false)
    expect(isValidEmbedUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('rejects plain http', () => {
    expect(isValidEmbedUrl('http://kuula.co/share/collection/7T3NS')).toBe(false)
  })

  it('rejects hosts outside the allowlist', () => {
    expect(isValidEmbedUrl('https://evil.example.com/x')).toBe(false)
  })

  it('is not fooled by an allowlisted host as a prefix or as userinfo', () => {
    expect(isValidEmbedUrl('https://kuula.co.evil.com/x')).toBe(false)
    expect(isValidEmbedUrl('https://evilkuula.co/x')).toBe(false)
    expect(isValidEmbedUrl('https://kuula.co@evil.example.com/x')).toBe(false)
  })

  it('rejects junk without throwing', () => {
    expect(isValidEmbedUrl('')).toBe(false)
    expect(isValidEmbedUrl(undefined)).toBe(false)
    expect(isValidEmbedUrl('not a url')).toBe(false)
  })
})

describe('extForMime', () => {
  it('maps the image types we accept', () => {
    expect(extForMime('image/webp')).toBe('webp')
    expect(extForMime('image/jpeg')).toBe('jpg')
    expect(extForMime('image/png')).toBe('png')
  })

  it('returns null for anything else', () => {
    expect(extForMime('text/html')).toBe(null)
    expect(extForMime('image/svg+xml')).toBe(null) // SVG can carry script
    expect(extForMime(undefined)).toBe(null)
  })
})

describe('MAX_UPLOAD_BYTES', () => {
  it('is 8MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(8 * 1024 * 1024)
  })
})

describe('isValidSlug', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(isValidSlug('tuff-mudder')).toBe(true)
    expect(isValidSlug('van21')).toBe(true)
  })

  it('rejects anything that would not survive a URL', () => {
    for (const bad of ['', 'Tuff Mudder', 'tuff_mudder', '-leading', 'trailing-', 'a--b', '../x']) {
      expect(isValidSlug(bad)).toBe(false)
    }
    expect(isValidSlug('a'.repeat(61))).toBe(false)
    expect(isValidSlug(null)).toBe(false)
  })
})

describe('slugify', () => {
  it('turns a display name into a slug', () => {
    expect(slugify('Fierce Couple Deluxe')).toBe('fierce-couple-deluxe')
    expect(slugify('  On-Site Caravans!  ')).toBe('on-site-caravans')
    expect(slugify('18.6ft Family')).toBe('18-6ft-family')
  })

  it('never returns an empty slug', () => {
    expect(slugify('!!!')).toBe('van')
  })

  it('truncates to the 60-char cap', () => {
    const result = slugify('a'.repeat(80))
    expect(result.length).toBe(60)
    expect(isValidSlug(result)).toBe(true)
  })
})

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', () => {
    expect(uniqueSlug('Little Wonder', ['tuff-mudder'])).toBe('little-wonder')
  })

  it('suffixes until it finds a free slug', () => {
    expect(uniqueSlug('Little Wonder', ['little-wonder'])).toBe('little-wonder-2')
    expect(uniqueSlug('Little Wonder', ['little-wonder', 'little-wonder-2'])).toBe(
      'little-wonder-3',
    )
  })

  it('stays within the 60-char cap when the base is already at the ceiling', () => {
    const base = slugify('a'.repeat(80))
    const result = uniqueSlug('a'.repeat(80), [base])
    expect(result.length).toBeLessThanOrEqual(60)
    expect(isValidSlug(result)).toBe(true)
  })
})

describe('validateVanPatch', () => {
  it('accepts an empty patch and a full valid one', () => {
    expect(validateVanPatch({})).toBeNull()
    expect(
      validateVanPatch({
        name: 'Tuff Mudder',
        slug: 'tuff-mudder',
        blurb: 'Small in size.',
        description: ['One.', 'Two.'],
        specs: ['12ft body'],
      }),
    ).toBeNull()
  })

  it('rejects over-long text', () => {
    expect(validateVanPatch({ name: 'a'.repeat(81) })).toMatch(/name/)
    expect(validateVanPatch({ blurb: 'a'.repeat(401) })).toMatch(/blurb/)
  })

  it('rejects a malformed slug', () => {
    expect(validateVanPatch({ slug: 'Not A Slug' })).toMatch(/slug/)
  })

  it('rejects lists that are not lists of strings', () => {
    expect(validateVanPatch({ description: 'not a list' })).toMatch(/description/)
    expect(validateVanPatch({ specs: [1, 2] })).toMatch(/spec/)
    expect(validateVanPatch({ specs: new Array(13).fill('x') })).toMatch(/specs/)
    expect(validateVanPatch({ description: ['a'.repeat(2001)] })).toMatch(/paragraph/)
  })

  it('rejects a non-string where text is expected', () => {
    expect(validateVanPatch({ name: 42 })).toMatch(/name/)
  })
})
