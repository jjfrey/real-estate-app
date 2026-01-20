import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, DELETE } from './route'
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
      invitations: {
        findFirst: vi.fn(),
      },
    },
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/invitations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns invitation details for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const invitationWithRelations = {
      ...mockInvitation,
      agent: {
        id: 1,
        firstName: 'John',
        lastName: 'Smith',
      },
      office: {
        id: 1,
        name: 'ABC Realty',
        brokerageName: 'ABC Brokerage',
      },
    }

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(invitationWithRelations)

    const request = new NextRequest('http://localhost/api/portal/invitations/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitation.email).toBe('newinvite@example.com')
    expect(data.invitation.agent).toBeDefined()
    expect(data.invitation.office).toBeDefined()
  })

  it('returns 400 for invalid invitation ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/invitations/invalid')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid invitation ID')
  })

  it('returns 404 when invitation not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/invitations/999')
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invitation not found')
  })

  it('returns 403 when office_admin tries to view office_admin invitation', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
      offices: [{ id: 1, name: 'Test Office', brokerageName: 'Test Brokerage' }],
    })

    const officeAdminInvitation = {
      ...mockInvitation,
      type: 'office_admin',
      officeId: 1,
    }

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(officeAdminInvitation)

    const request = new NextRequest('http://localhost/api/portal/invitations/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('returns 403 when office_admin tries to view invitation for different office', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
      offices: [{ id: 1, name: 'Test Office', brokerageName: 'Test Brokerage' }],
    })

    const differentOfficeInvitation = {
      ...mockInvitation,
      type: 'agent',
      officeId: 999, // Different office
    }

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(differentOfficeInvitation)

    const request = new NextRequest('http://localhost/api/portal/invitations/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/invitations/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})

describe('DELETE /api/portal/invitations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes invitation successfully for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue({
      ...mockInvitation,
      acceptedAt: null,
    })

    const mockWhere = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never)

    const request = new NextRequest('http://localhost/api/portal/invitations/1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('returns 400 for invalid invitation ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/invitations/invalid', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid invitation ID')
  })

  it('returns 404 when invitation not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/invitations/999', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invitation not found')
  })

  it('returns 400 when trying to revoke accepted invitation', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue({
      ...mockInvitation,
      acceptedAt: new Date(), // Already accepted
    })

    const request = new NextRequest('http://localhost/api/portal/invitations/1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Cannot revoke an accepted invitation')
  })

  it('returns 403 when office_admin tries to delete office_admin invitation', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
      offices: [{ id: 1, name: 'Test Office', brokerageName: 'Test Brokerage' }],
    })

    const officeAdminInvitation = {
      ...mockInvitation,
      type: 'office_admin',
      officeId: 1,
      acceptedAt: null,
    }

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(officeAdminInvitation)

    const request = new NextRequest('http://localhost/api/portal/invitations/1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('returns 403 when office_admin tries to delete invitation for different office', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
      offices: [{ id: 1, name: 'Test Office', brokerageName: 'Test Brokerage' }],
    })

    const differentOfficeInvitation = {
      ...mockInvitation,
      type: 'agent',
      officeId: 999, // Different office
      acceptedAt: null,
    }

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(differentOfficeInvitation)

    const request = new NextRequest('http://localhost/api/portal/invitations/1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('allows office_admin to delete agent invitation for their office', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
      offices: [{ id: 1, name: 'Test Office', brokerageName: 'Test Brokerage' }],
    })

    const ownOfficeInvitation = {
      ...mockInvitation,
      type: 'agent',
      officeId: 1, // Same office
      acceptedAt: null,
    }

    vi.mocked(db.query.invitations.findFirst).mockResolvedValue(ownOfficeInvitation)

    const mockWhere = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never)

    const request = new NextRequest('http://localhost/api/portal/invitations/1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/invitations/1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})
