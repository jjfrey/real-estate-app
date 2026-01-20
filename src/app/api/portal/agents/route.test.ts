import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { mockAgent, mockOffice, mockPortalUser } from '@/test/mocks'

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
      users: {
        findFirst: vi.fn(),
      },
      listings: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(),
      })),
    })),
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns agents list for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const agentWithStats = {
      ...mockAgent,
      listingCount: 10,
    }

    const mockOrderBy = vi.fn().mockResolvedValue([agentWithStats])
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    // Mock user lookup for portal access
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockPortalUser)

    // Mock listing lookup for office
    vi.mocked(db.query.listings.findFirst).mockResolvedValue({
      id: 1,
      office: {
        id: mockOffice.id,
        name: mockOffice.name,
        brokerageName: mockOffice.brokerageName,
      },
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.agents).toHaveLength(1)
    expect(data.agents[0].firstName).toBe('John')
    expect(data.agents[0].lastName).toBe('Smith')
    expect(data.agents[0].listingCount).toBe(10)
    expect(data.agents[0].portalUser).toBeDefined()
    expect(data.agents[0].office).toBeDefined()
  })

  it('returns agents without portal access', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const agentWithoutPortal = {
      ...mockAgent,
      userId: null,
      listingCount: 5,
    }

    const mockOrderBy = vi.fn().mockResolvedValue([agentWithoutPortal])
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    vi.mocked(db.query.listings.findFirst).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.agents).toHaveLength(1)
    expect(data.agents[0].portalUser).toBeNull()
    expect(data.agents[0].office).toBeNull()
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

  it('returns empty array when no agents exist', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const mockOrderBy = vi.fn().mockResolvedValue([])
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.agents).toHaveLength(0)
  })

  it('requires super_admin role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const mockOrderBy = vi.fn().mockResolvedValue([])
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    await GET()

    expect(requirePortalRole).toHaveBeenCalledWith(['super_admin'])
  })
})
