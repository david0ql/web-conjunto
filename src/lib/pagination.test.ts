import { describe, it, expect } from 'vitest'
import type { PaginatedResponse, PaginationMeta } from '@/types/api'

// Verify the PaginatedResponse type shape is correctly defined
describe('PaginatedResponse type', () => {
  it('has correct shape', () => {
    const response: PaginatedResponse<{ id: string }> = {
      data: [{ id: '1' }],
      meta: {
        total: 1,
        page: 1,
        limit: 15,
        totalPages: 1,
      },
    }
    expect(response.data).toHaveLength(1)
    expect(response.meta.total).toBe(1)
    expect(response.meta.page).toBe(1)
    expect(response.meta.limit).toBe(15)
    expect(response.meta.totalPages).toBe(1)
  })

  it('meta totalPages calculation', () => {
    const cases: Array<{ total: number; limit: number; expected: number }> = [
      { total: 0, limit: 15, expected: 0 },
      { total: 1, limit: 15, expected: 1 },
      { total: 15, limit: 15, expected: 1 },
      { total: 16, limit: 15, expected: 2 },
      { total: 100, limit: 15, expected: 7 },
    ]

    for (const { total, limit, expected } of cases) {
      const totalPages = Math.ceil(total / limit)
      expect(totalPages).toBe(expected)
    }
  })

  it('PaginationMeta is correctly typed', () => {
    const meta: PaginationMeta = {
      total: 50,
      page: 2,
      limit: 10,
      totalPages: 5,
    }
    expect(meta.total).toBe(50)
    expect(meta.page).toBe(2)
    expect(meta.limit).toBe(10)
    expect(meta.totalPages).toBe(5)
  })
})
