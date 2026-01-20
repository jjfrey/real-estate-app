import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { mockAgent, mockPortalUser, mockOffice } from '@/test/mocks'

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
    query: {
      agents: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
        groupBy: vi.fn(),
        orderBy: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
    })),
    selectDistinct: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(),
        })),
      })),
    })),
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/agents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns agent details for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.agents.findFirst).mockResolvedValue(mockAgent)
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockPortalUser)

    // Mock listing stats
    let selectCallCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        // Listing count
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 10 }]),
          })),
        } as never
      } else if (selectCallCount === 2) {
        // Recent listings
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: 1,
                    mlsId: 'A123',
                    streetAddress: '123 Main St',
                    city: 'Sarasota',
                    state: 'FL',
                    price: '450000',
                    status: 'Active',
                    propertyType: 'Single Family',
                    bedrooms: 3,
                    bathrooms: '2',
                  },
                ]),
              })),
            })),
          })),
        } as never
      } else if (selectCallCount === 3) {
        // Lead count
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          })),
        } as never
      } else {
        // Leads by status
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn().mockResolvedValue([
                { status: 'new', count: 3 },
                { status: 'contacted', count: 2 },
              ]),
            })),
          })),
        } as never
      }
    })

    // Mock offices query
    vi.mocked(db.selectDistinct).mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: mockOffice.id,
              name: mockOffice.name,
              brokerageName: mockOffice.brokerageName,
              city: mockOffice.city,
              state: mockOffice.state,
            },
          ]),
        })),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/portal/agents/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.agent.firstName).toBe('John')
    expect(data.agent.lastName).toBe('Smith')
    expect(data.agent.portalUser).toBeDefined()
    expect(data.agent.offices).toHaveLength(1)
    expect(data.agent.stats.listingCount).toBe(10)
    expect(data.agent.stats.leadCount).toBe(5)
    expect(data.agent.recentListings).toHaveLength(1)
  })

  it('returns 400 for invalid agent ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/agents/invalid')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid agent ID')
  })

  it('returns 404 when agent not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.agents.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/agents/999')
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Agent not found')
  })

  it('returns agent without portal user when not linked', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const agentWithoutPortal = { ...mockAgent, userId: null }
    vi.mocked(db.query.agents.findFirst).mockResolvedValue(agentWithoutPortal)

    // Mock all the select calls with proper chaining for each query type
    let selectCallCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        // Listing count
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          })),
        } as never
      } else if (selectCallCount === 2) {
        // Recent listings
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([]),
              })),
            })),
          })),
        } as never
      } else if (selectCallCount === 3) {
        // Lead count
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          })),
        } as never
      } else {
        // Leads by status
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn().mockResolvedValue([]),
            })),
          })),
        } as never
      }
    })

    vi.mocked(db.selectDistinct).mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/portal/agents/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.agent.portalUser).toBeNull()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/agents/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 403 when user is not super_admin', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 403, message: 'Forbidden' })

    const request = new NextRequest('http://localhost/api/portal/agents/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('requires super_admin role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.agents.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/agents/1')
    await GET(request, { params: Promise.resolve({ id: '1' }) })

    expect(requirePortalRole).toHaveBeenCalledWith(['super_admin'])
  })
})
