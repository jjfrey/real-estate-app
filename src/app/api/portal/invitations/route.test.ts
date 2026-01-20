import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { mockInvitation, mockAgent, mockOffice } from '@/test/mocks'

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
  canManageOffice: vi.fn(),
  PortalAuthError: class PortalAuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

// Mock email
vi.mock('@/lib/email', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock the database
vi.mock('@/db', () => ({
  db: {
    query: {
      invitations: {
        findFirst: vi.fn(),
      },
      agents: {
        findFirst: vi.fn(),
      },
      offices: {
        findFirst: vi.fn(),
      },
      listings: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(),
            })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}))

import { requirePortalRole, canManageOffice } from '@/lib/portal-auth'
import { sendInvitationEmail } from '@/lib/email'
import { db } from '@/db'

describe('GET /api/portal/invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns invitations list for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const mockInvitationData = {
      id: 1,
      email: 'newinvite@example.com',
      type: 'agent',
      agentId: 1,
      officeId: 1,
      expiresAt: futureDate,
      acceptedAt: null,
      createdAt: new Date(),
      agentFirstName: 'John',
      agentLastName: 'Smith',
      officeName: 'ABC Realty',
      officeBrokerageName: 'ABC Brokerage',
    }

    const mockOrderBy = vi.fn().mockResolvedValue([mockInvitationData])
    const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
    const mockLeftJoin2 = vi.fn(() => ({ where: mockWhere }))
    const mockLeftJoin1 = vi.fn(() => ({ leftJoin: mockLeftJoin2 }))
    const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin1 }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    const request = new NextRequest('http://localhost/api/portal/invitations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitations).toHaveLength(1)
    expect(data.invitations[0].email).toBe('newinvite@example.com')
    expect(data.invitations[0].status).toBe('pending')
  })

  it('returns empty for office_admin with no offices', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
      offices: [],
    })

    const request = new NextRequest('http://localhost/api/portal/invitations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitations).toHaveLength(0)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/invitations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('filters expired invitations', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const expiredDate = new Date(Date.now() - 1000) // Past date
    const mockExpiredInvitation = {
      id: 1,
      email: 'expired@example.com',
      type: 'agent',
      agentId: 1,
      officeId: 1,
      expiresAt: expiredDate,
      acceptedAt: null,
      createdAt: new Date(),
      agentFirstName: null,
      agentLastName: null,
      officeName: null,
      officeBrokerageName: null,
    }

    const mockOrderBy = vi.fn().mockResolvedValue([mockExpiredInvitation])
    const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
    const mockLeftJoin2 = vi.fn(() => ({ where: mockWhere }))
    const mockLeftJoin1 = vi.fn(() => ({ leftJoin: mockLeftJoin2 }))
    const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin1 }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    const request = new NextRequest('http://localhost/api/portal/invitations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitations).toHaveLength(0) // Expired invitation filtered out
  })
})

describe('POST /api/portal/invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates agent invitation successfully', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.agents.findFirst).mockResolvedValue({
      ...mockAgent,
      userId: null, // No existing account
    })
    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(null) // No existing invite

    const newInvitation = {
      id: 1,
      email: 'agent@example.com',
      type: 'agent',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }

    const mockReturning = vi.fn().mockResolvedValue([newInvitation])
    const mockValues = vi.fn(() => ({ returning: mockReturning }))
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'agent@example.com',
        type: 'agent',
        agentId: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.invitation.email).toBe('agent@example.com')
    expect(sendInvitationEmail).toHaveBeenCalled()
  })

  it('returns 400 when email is missing', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        type: 'agent',
        agentId: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email and type are required')
  })

  it('returns 400 for invalid email format', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        type: 'agent',
        agentId: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid email format')
  })

  it('returns 400 for invalid type', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        type: 'invalid_type',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("Type must be")
  })

  it('returns 400 when agentId missing for agent type', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        type: 'agent',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('agentId is required for agent invitations')
  })

  it('returns 404 when agent not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.agents.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        type: 'agent',
        agentId: 999,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Agent not found')
  })

  it('returns 400 when agent already has portal account', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.agents.findFirst).mockResolvedValue({
      ...mockAgent,
      userId: 'existing-user', // Has account
    })

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        type: 'agent',
        agentId: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Agent already has a portal account')
  })

  it('returns 400 when active invitation exists', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.agents.findFirst).mockResolvedValue({
      ...mockAgent,
      userId: null,
    })
    vi.mocked(db.query.invitations.findFirst).mockResolvedValue({
      ...mockInvitation,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Future date
    })

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        type: 'agent',
        agentId: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('An active invitation already exists for this email')
  })

  it('returns 403 when office_admin tries to invite office_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
      offices: [{ id: 1, name: 'Test Office', brokerageName: 'Test Brokerage' }],
    })

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newadmin@example.com',
        type: 'office_admin',
        officeId: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('creates office_admin invitation for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(mockOffice)
    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(null)

    const newInvitation = {
      id: 1,
      email: 'newadmin@example.com',
      type: 'office_admin',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }

    const mockReturning = vi.fn().mockResolvedValue([newInvitation])
    const mockValues = vi.fn(() => ({ returning: mockReturning }))
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newadmin@example.com',
        type: 'office_admin',
        officeId: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.invitation.type).toBe('office_admin')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        type: 'agent',
        agentId: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})
