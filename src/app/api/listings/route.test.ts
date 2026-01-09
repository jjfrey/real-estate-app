import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { mockListingsResponse } from '@/test/mocks'

vi.mock('@/lib/queries', () => ({
  getListings: vi.fn(),
}))

import { getListings } from '@/lib/queries'

describe('GET /api/listings', () => {
  beforeEach(() => {
    vi.mocked(getListings).mockReset()
  })

  it('returns listings with default pagination', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.listings).toHaveLength(3)
    expect(data.pagination).toEqual({
      page: 1,
      limit: 24,
      total: 150,
      totalPages: 7,
    })
  })

  it('passes city filter to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?city=SARASOTA')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'SARASOTA' }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes zip filter to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?zip=34236')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ zip: '34236' }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes status filter to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?status=Active&status=Pending')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ status: ['Active', 'Pending'] }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes propertyType filter to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?propertyType=SingleFamily&propertyType=Condo')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: ['SingleFamily', 'Condo'] }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes price range to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?minPrice=200000&maxPrice=500000')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ minPrice: 200000, maxPrice: 500000 }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes bedroom filter to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?minBeds=3&maxBeds=5')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ minBeds: 3, maxBeds: 5 }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes bathroom filter to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?minBaths=2&maxBaths=4')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ minBaths: 2, maxBaths: 4 }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes sqft filter to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?minSqft=1500&maxSqft=3000')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ minSqft: 1500, maxSqft: 3000 }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes year built filter to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?minYear=2000&maxYear=2020')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ minYear: 2000, maxYear: 2020 }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes bounds to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?north=28&south=26&east=-80&west=-82')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({
        bounds: { north: 28, south: 26, east: -80, west: -82 }
      }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes radius search params to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?lat=27.3&lng=-82.5&radius=10')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 27.3, lng: -82.5, radius: 10 }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('passes sort parameters to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?sort=price&sortDir=asc')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.any(Object),
      { field: 'price', direction: 'asc' },
      expect.any(Object)
    )
  })

  it('uses default sort when not specified', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.any(Object),
      { field: 'createdAt', direction: 'desc' },
      expect.any(Object)
    )
  })

  it('passes pagination parameters to getListings', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?page=3&limit=50')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      { page: 3, limit: 50 }
    )
  })

  it('limits max page size to 100', async () => {
    vi.mocked(getListings).mockResolvedValue(mockListingsResponse)

    const request = new NextRequest('http://localhost/api/listings?limit=200')
    await GET(request)

    expect(getListings).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      { page: 1, limit: 100 }
    )
  })

  it('returns 500 on error', async () => {
    vi.mocked(getListings).mockRejectedValue(new Error('Database error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = new NextRequest('http://localhost/api/listings')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch listings')

    consoleSpy.mockRestore()
  })
})
