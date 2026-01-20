import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock portal auth
vi.mock('@/lib/portal-auth', () => ({
  requirePortalRole: vi.fn(),
  portalAuthErrorResponse: vi.fn((error) => {
    if (error.status === 401) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.status === 403) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }),
}))

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        groupBy: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
    })),
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/sync/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns sync stats for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    // Mock all the database queries
    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    }

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      // Return different values based on call order
      if (callCount === 1) {
        // Listing stats by status
        mockSelectChain.from = vi.fn(() => ({
          groupBy: vi.fn().mockResolvedValue([
            { status: 'Active', count: 1320 },
            { status: 'For Rent', count: 585 },
            { status: 'Pending', count: 265 },
          ]),
        }))
      } else if (callCount === 2) {
        // Total listings
        mockSelectChain.from = vi.fn().mockResolvedValue([{ count: 2170 }])
      } else if (callCount === 3) {
        // Total agents
        mockSelectChain.from = vi.fn().mockResolvedValue([{ count: 450 }])
      } else if (callCount === 4) {
        // Total offices
        mockSelectChain.from = vi.fn().mockResolvedValue([{ count: 85 }])
      } else if (callCount === 5) {
        // Total photos
        mockSelectChain.from = vi.fn().mockResolvedValue([{ count: 78000 }])
      } else if (callCount === 6) {
        // Latest listing
        mockSelectChain.from = vi.fn().mockResolvedValue([{ updatedAt: new Date('2024-01-15T10:30:00Z') }])
      } else if (callCount === 7) {
        // Property types
        mockSelectChain.from = vi.fn(() => ({
          groupBy: vi.fn().mockResolvedValue([
            { type: 'Single Family', count: 1127 },
            { type: 'Condo', count: 651 },
          ]),
        }))
      } else {
        // Cities
        mockSelectChain.from = vi.fn(() => ({
          groupBy: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([
                { city: 'Naples', count: 420 },
                { city: 'Sarasota', count: 380 },
              ]),
            })),
          })),
        }))
      }
      return mockSelectChain as never
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.totals).toBeDefined()
    expect(data.byStatus).toBeDefined()
    expect(data.byPropertyType).toBeDefined()
    expect(data.topCities).toBeDefined()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 403 when user is not super_admin', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 403, message: 'Forbidden' })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('requires super_admin role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    // Setup minimal mocks for the call to complete
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn(() => ({
        groupBy: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    } as never))

    await GET()

    expect(requirePortalRole).toHaveBeenCalledWith(['super_admin'])
  })
})
