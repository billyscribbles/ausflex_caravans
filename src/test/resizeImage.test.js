import { describe, it, expect } from 'vitest'
import { fitWithin } from '../admin/resizeImage.js'

describe('fitWithin', () => {
  it('leaves an already-small image alone', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 })
  })

  it('scales a landscape photo by its long edge', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
  })

  it('scales a portrait photo by its long edge', () => {
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 })
  })

  it('never returns a zero dimension for an extreme panorama', () => {
    const { width, height } = fitWithin(20000, 100, 2000)
    expect(width).toBe(2000)
    expect(height).toBeGreaterThanOrEqual(1)
  })
})
