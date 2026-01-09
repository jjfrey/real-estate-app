import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { mockListingDetail } from '@/test/mocks'

vi.mock('@/lib/queries', () => ({
  getListingById: vi.fn(),
  getListingByMlsId: vi.fn(),
}))

import { getListingById, getListingByMlsId } from '@/lib/queries'

describe('GET /api/listings/[id]', () => {
  beforeEach(() => {
    vi.mocked(getListingById).mockReset()
    vi.mocked(getListingByMlsId).mockReset()
  })

  it('returns listing by numeric ID', async () => {
    vi.mocked(getListingById).mockResolvedValue(mockListingDetail)

    const request = new NextRequest('http://localhost/api/listings/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockListingDetail)
    expect(getListingById).toHaveBeenCalledWith(1)
    expect(getListingByMlsId).not.toHaveBeenCalled()
  })

  it('returns listing by MLS ID', async () => {
    vi.mocked(getListingByMlsId).mockResolvedValue(mockListingDetail)

    const request = new NextRequest('http://localhost/api/listings/A123456')
    const response = await GET(request, { params: Promise.resolve({ id: 'A123456' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockListingDetail)
    expect(getListingByMlsId).toHaveBeenCalledWith('A123456')
    expect(getListingById).not.toHaveBeenCalled()
  })

  it('returns 404 when listing not found by numeric ID', async () => {
    vi.mocked(getListingById).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/listings/999')
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Listing not found')
  })

  it('returns 404 when listing not found by MLS ID', async () => {
    vi.mocked(getListingByMlsId).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/listings/INVALID')
    const response = await GET(request, { params: Promise.resolve({ id: 'INVALID' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Listing not found')
  })

  it('returns 500 on error', async () => {
    vi.mocked(getListingById).mockRejectedValue(new Error('Database error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = new NextRequest('http://localhost/api/listings/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch listing')

    consoleSpy.mockRestore()
  })
})
