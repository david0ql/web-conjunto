import { describe, expect, it } from 'vitest'
import { matchesSearch } from './search'

describe('matchesSearch', () => {
  it('matches name + last name with repeated spaces, case and accents', () => {
    expect(matchesSearch('ANA  DELIA CÁEDENAS', 'Ana Delia Caedenas')).toBe(true)
  })

  it('matches words in any order', () => {
    expect(matchesSearch('Ana Delia Caedenas', 'caedenas ana')).toBe(true)
  })

  it('requires every word to be present', () => {
    expect(matchesSearch('Ana Delia Delgado', 'ana caedenas')).toBe(false)
  })

  it('matches everything for a blank query', () => {
    expect(matchesSearch('lo que sea', '   ')).toBe(true)
  })
})
