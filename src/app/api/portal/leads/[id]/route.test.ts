import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from './route'
import { mockPortalLead } from '@/test/mocks'

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
  canAccessLead: vi.fn(),
  PortalAuthError: class PortalAuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

// Mock the database
vi.mock('@/db', () => ({
  db: {
    query: {
      leads: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(),
              })),
            })),
          })),
        })),
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(),
          })),
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

import { requirePortalRole, canAccessLead } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/leads/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns lead details for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const leadRow = {
      id: 1,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-555-5555',
      leadType: 'info_request',
      message: 'Test message',
      status: 'new',
      notes: null,
      preferredTourDate: null,
      preferredTourTime: null,
      createdAt: new Date(),
      contactedAt: null,
      convertedAt: null,
      closedAt: null,
      listingId: 1,
      listingAddress: '123 Main St',
      listingCity: 'Sarasota',
      listingState: 'FL',
      listingZip: '34236',
      listingPrice: '450000',
      listingMlsId: 'A123',
      listingBedrooms: 3,
      listingBathrooms: '2',
      listingPropertyType: 'Single Family',
      agentId: 1,
      agentFirstName: 'John',
      agentLastName: 'Smith',
      agentEmail: 'john@example.com',
      agentPhone: '555-123-4567',
      officeId: 1,
      officeName: 'ABC Realty',
      officeBrokerageName: 'ABC Brokerage',
    }

    let selectCallCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        // Lead query
        const mockLimit = vi.fn().mockResolvedValue([leadRow])
        const mockWhere = vi.fn(() => ({ limit: mockLimit }))
        const mockLeftJoin3 = vi.fn(() => ({ where: mockWhere }))
        const mockLeftJoin2 = vi.fn(() => ({ leftJoin: mockLeftJoin3 }))
        const mockLeftJoin1 = vi.fn(() => ({ leftJoin: mockLeftJoin2 }))
        return { from: vi.fn(() => ({ leftJoin: mockLeftJoin1 })) } as never
      }
      // Photos query
      const mockPhotoLimit = vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com/photo.jpg' }])
      const mockOrderBy = vi.fn(() => ({ limit: mockPhotoLimit }))
      const mockPhotoWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
      return { from: vi.fn(() => ({ where: mockPhotoWhere })) } as never
    })

    vi.mocked(canAccessLead).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/portal/leads/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.lead.name).toBe('Jane Doe')
    expect(data.lead.listing).toBeDefined()
    expect(data.lead.agent).toBeDefined()
    expect(data.lead.office).toBeDefined()
  })

  it('returns 400 for invalid lead ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/leads/invalid')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid lead ID')
  })

  it('returns 404 when lead not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const mockLimit = vi.fn().mockResolvedValue([])
    const mockWhere = vi.fn(() => ({ limit: mockLimit }))
    const mockLeftJoin3 = vi.fn(() => ({ where: mockWhere }))
    const mockLeftJoin2 = vi.fn(() => ({ leftJoin: mockLeftJoin3 }))
    const mockLeftJoin1 = vi.fn(() => ({ leftJoin: mockLeftJoin2 }))
    const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin1 }))

    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    const request = new NextRequest('http://localhost/api/portal/leads/999')
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Lead not found')
  })

  it('returns 403 when user cannot access lead', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-789', email: 'agent@example.com', name: 'Agent', role: 'agent' },
      agent: { id: 42, firstName: 'John', lastName: 'Smith' },
    })

    const leadRow = {
      id: 1,
      agentId: 99, // Different agent
      officeId: 1,
    }

    const mockLimit = vi.fn().mockResolvedValue([leadRow])
    const mockWhere = vi.fn(() => ({ limit: mockLimit }))
    const mockLeftJoin3 = vi.fn(() => ({ where: mockWhere }))
    const mockLeftJoin2 = vi.fn(() => ({ leftJoin: mockLeftJoin3 }))
    const mockLeftJoin1 = vi.fn(() => ({ leftJoin: mockLeftJoin2 }))
    const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin1 }))

    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)
    vi.mocked(canAccessLead).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/portal/leads/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/leads/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})

describe('PATCH /api/portal/leads/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates lead status successfully', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.leads.findFirst).mockResolvedValue({
      ...mockPortalLead,
      status: 'new',
    })
    vi.mocked(canAccessLead).mockResolvedValue(true)

    const updatedLead = { ...mockPortalLead, status: 'contacted' }
    const mockReturning = vi.fn().mockResolvedValue([updatedLead])
    const mockWhere = vi.fn(() => ({ returning: mockReturning }))
    const mockSet = vi.fn(() => ({ where: mockWhere }))
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

    const request = new NextRequest('http://localhost/api/portal/leads/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'contacted' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.lead.status).toBe('contacted')
  })

  it('updates lead notes successfully', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.leads.findFirst).mockResolvedValue(mockPortalLead)
    vi.mocked(canAccessLead).mockResolvedValue(true)

    const updatedLead = { ...mockPortalLead, notes: 'Updated notes' }
    const mockReturning = vi.fn().mockResolvedValue([updatedLead])
    const mockWhere = vi.fn(() => ({ returning: mockReturning }))
    const mockSet = vi.fn(() => ({ where: mockWhere }))
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

    const request = new NextRequest('http://localhost/api/portal/leads/1', {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'Updated notes' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.lead.notes).toBe('Updated notes')
  })

  it('returns 400 for invalid status', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.leads.findFirst).mockResolvedValue(mockPortalLead)
    vi.mocked(canAccessLead).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/portal/leads/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid_status' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid status')
  })

  it('returns 400 when no valid fields to update', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.leads.findFirst).mockResolvedValue(mockPortalLead)
    vi.mocked(canAccessLead).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/portal/leads/1', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No valid fields to update')
  })

  it('returns 400 for invalid lead ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/leads/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'contacted' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid lead ID')
  })

  it('returns 404 when lead not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.leads.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/leads/999', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'contacted' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Lead not found')
  })

  it('returns 403 when user cannot access lead', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-789', email: 'agent@example.com', name: 'Agent', role: 'agent' },
      agent: { id: 42, firstName: 'John', lastName: 'Smith' },
    })

    vi.mocked(db.query.leads.findFirst).mockResolvedValue({
      ...mockPortalLead,
      agentId: 99, // Different agent
    })
    vi.mocked(canAccessLead).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/portal/leads/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'contacted' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})
