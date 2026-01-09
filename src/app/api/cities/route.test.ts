import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { mockCitiesResponse } from '@/test/mocks'

vi.mock('@/lib/queries', () => ({
  getCitiesWithCounts: vi.fn(),
}))

import { getCitiesWithCounts } from '@/lib/queries'

describe('GET /api/cities', () => {
  beforeEach(() => {
    vi.mocked(getCitiesWithCounts).mockReset()
  })

  it('returns cities with counts', async () => {
    vi.mocked(getCitiesWithCounts).mockResolvedValue(mockCitiesResponse)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCitiesResponse)
  })

  it('calls getCitiesWithCounts', async () => {
    vi.mocked(getCitiesWithCounts).mockResolvedValue(mockCitiesResponse)

    await GET()

    expect(getCitiesWithCounts).toHaveBeenCalled()
  })

  it('returns 500 on error', async () => {
    vi.mocked(getCitiesWithCounts).mockRejectedValue(new Error('Database error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch cities')

    consoleSpy.mockRestore()
  })
})
