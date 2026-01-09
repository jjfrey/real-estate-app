import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { mockAutocompleteResults } from '@/test/mocks'

vi.mock('@/lib/queries', () => ({
  searchAutocomplete: vi.fn(),
}))

import { searchAutocomplete } from '@/lib/queries'

describe('GET /api/search/autocomplete', () => {
  beforeEach(() => {
    vi.mocked(searchAutocomplete).mockReset()
  })

  it('returns autocomplete results', async () => {
    vi.mocked(searchAutocomplete).mockResolvedValue(mockAutocompleteResults)

    const request = new NextRequest('http://localhost/api/search/autocomplete?q=Sarasota')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockAutocompleteResults)
  })

  it('passes query to searchAutocomplete', async () => {
    vi.mocked(searchAutocomplete).mockResolvedValue(mockAutocompleteResults)

    const request = new NextRequest('http://localhost/api/search/autocomplete?q=Naples')
    await GET(request)

    expect(searchAutocomplete).toHaveBeenCalledWith('Naples', 10)
  })

  it('respects limit parameter', async () => {
    vi.mocked(searchAutocomplete).mockResolvedValue(mockAutocompleteResults)

    const request = new NextRequest('http://localhost/api/search/autocomplete?q=Tampa&limit=5')
    await GET(request)

    expect(searchAutocomplete).toHaveBeenCalledWith('Tampa', 5)
  })

  it('limits max results to 20', async () => {
    vi.mocked(searchAutocomplete).mockResolvedValue(mockAutocompleteResults)

    const request = new NextRequest('http://localhost/api/search/autocomplete?q=Miami&limit=50')
    await GET(request)

    expect(searchAutocomplete).toHaveBeenCalledWith('Miami', 20)
  })

  it('returns empty array when query is less than 2 characters', async () => {
    const request = new NextRequest('http://localhost/api/search/autocomplete?q=S')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
    expect(searchAutocomplete).not.toHaveBeenCalled()
  })

  it('returns empty array when query is empty', async () => {
    const request = new NextRequest('http://localhost/api/search/autocomplete?q=')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
    expect(searchAutocomplete).not.toHaveBeenCalled()
  })

  it('returns empty array when query is missing', async () => {
    const request = new NextRequest('http://localhost/api/search/autocomplete')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
    expect(searchAutocomplete).not.toHaveBeenCalled()
  })

  it('returns 500 on error', async () => {
    vi.mocked(searchAutocomplete).mockRejectedValue(new Error('Database error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = new NextRequest('http://localhost/api/search/autocomplete?q=Sarasota')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to search')

    consoleSpy.mockRestore()
  })
})
