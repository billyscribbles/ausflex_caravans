// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isValidEmbedUrl, extForMime, MAX_UPLOAD_BYTES } from './validate.js'

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
