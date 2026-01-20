import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from './route'
import { mockOffice, mockPortalUser, mockAgent } from '@/test/mocks'

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
      offices: {
        findFirst: vi.fn(),
      },
      officeAdmins: {
        findMany: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    selectDistinct: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/offices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns office details for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(mockOffice)
    vi.mocked(db.query.officeAdmins.findMany).mockResolvedValue([
      { user: mockPortalUser },
    ])

    // Mock listing count
    const mockWhere = vi.fn().mockResolvedValue([{ count: 25 }])
    const mockFrom = vi.fn(() => ({ where: mockWhere }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    // Mock agents query
    const mockAgentWhere = vi.fn().mockResolvedValue([mockAgent])
    const mockAgentInnerJoin = vi.fn(() => ({ where: mockAgentWhere }))
    const mockAgentFrom = vi.fn(() => ({ innerJoin: mockAgentInnerJoin }))
    vi.mocked(db.selectDistinct).mockReturnValue({ from: mockAgentFrom } as never)

    const request = new NextRequest('http://localhost/api/portal/offices/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.office.name).toBe('ABC Realty')
    expect(data.office.admins).toHaveLength(1)
    expect(data.office.listingCount).toBe(25)
  })

  it('returns 400 for invalid office ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/offices/invalid')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid office ID')
  })

  it('returns 404 when office not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/offices/999')
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Office not found')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/offices/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})

describe('PATCH /api/portal/offices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates office settings successfully', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(mockOffice)

    const updatedOffice = {
      ...mockOffice,
      leadRoutingEmail: 'newleads@example.com',
      routeToTeamLead: true,
    }

    const mockReturning = vi.fn().mockResolvedValue([updatedOffice])
    const mockWhere = vi.fn(() => ({ returning: mockReturning }))
    const mockSet = vi.fn(() => ({ where: mockWhere }))
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

    const request = new NextRequest('http://localhost/api/portal/offices/1', {
      method: 'PATCH',
      body: JSON.stringify({
        leadRoutingEmail: 'newleads@example.com',
        routeToTeamLead: true,
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.office.leadRoutingEmail).toBe('newleads@example.com')
    expect(data.office.routeToTeamLead).toBe(true)
  })

  it('returns 400 for invalid office ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/offices/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ leadRoutingEmail: 'test@example.com' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid office ID')
  })

  it('returns 404 when office not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/offices/999', {
      method: 'PATCH',
      body: JSON.stringify({ leadRoutingEmail: 'test@example.com' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Office not found')
  })

  it('clears leadRoutingEmail when empty string provided', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(mockOffice)

    const updatedOffice = { ...mockOffice, leadRoutingEmail: null }

    const mockReturning = vi.fn().mockResolvedValue([updatedOffice])
    const mockWhere = vi.fn(() => ({ returning: mockReturning }))
    const mockSet = vi.fn(() => ({ where: mockWhere }))
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

    const request = new NextRequest('http://localhost/api/portal/offices/1', {
      method: 'PATCH',
      body: JSON.stringify({ leadRoutingEmail: '' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.office.leadRoutingEmail).toBeNull()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/offices/1', {
      method: 'PATCH',
      body: JSON.stringify({ leadRoutingEmail: 'test@example.com' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})
