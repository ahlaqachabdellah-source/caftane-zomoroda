import { describe, expect, it } from 'vitest'
import { GOOGLE_MAPS_URL } from './maps'

describe('GOOGLE_MAPS_URL', () => {
  it('is the exact owner-provided share link, never altered', () => {
    expect(GOOGLE_MAPS_URL).toBe('https://maps.app.goo.gl/HBVGMER7b4Uor8neA')
  })
})
