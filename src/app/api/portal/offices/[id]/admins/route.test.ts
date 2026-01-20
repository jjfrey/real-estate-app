import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from './route'
import { mockOffice, mockOfficeAdmin } from '@/test/mocks'

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
      users: {
        findFirst: vi.fn(),
      },
      officeAdmins: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'

describe('POST /api/portal/offices/[id]/admins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds admin to office successfully', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(mockOffice)
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockOfficeAdmin)
    vi.mocked(db.query.officeAdmins.findFirst).mockResolvedValue(null) // Not already admin

    const newAdmin = { id: 1, officeId: 1, userId: 'user-456' }
    const mockReturning = vi.fn().mockResolvedValue([newAdmin])
    const mockValues = vi.fn(() => ({ returning: mockReturning }))
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-456' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.admin.userId).toBe('user-456')
  })

  it('returns 400 for invalid office ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/offices/invalid/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-456' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid office ID')
  })

  it('returns 400 when userId is missing', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('userId is required')
  })

  it('returns 404 when office not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/offices/999/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-456' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: '999' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Office not found')
  })

  it('returns 404 when user not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(mockOffice)
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'nonexistent' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('returns 400 when user role is not office_admin or super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(mockOffice)
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      ...mockOfficeAdmin,
      role: 'agent',
    })

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-456' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('User must be an office_admin or super_admin')
  })

  it('returns 400 when user is already admin of office', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.offices.findFirst).mockResolvedValue(mockOffice)
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockOfficeAdmin)
    vi.mocked(db.query.officeAdmins.findFirst).mockResolvedValue({
      id: 1,
      officeId: 1,
      userId: 'user-456',
    })

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-456' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('User is already an admin of this office')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-456' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})

describe('DELETE /api/portal/offices/[id]/admins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes admin from office successfully', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const mockReturning = vi.fn().mockResolvedValue([{ id: 1, officeId: 1, userId: 'user-456' }])
    const mockWhere = vi.fn(() => ({ returning: mockReturning }))
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never)

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins?userId=user-456', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('returns 400 for invalid office ID', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/offices/invalid/admins?userId=user-456', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid office ID')
  })

  it('returns 400 when userId is missing', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('userId is required')
  })

  it('returns 404 when admin record not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const mockReturning = vi.fn().mockResolvedValue([])
    const mockWhere = vi.fn(() => ({ returning: mockReturning }))
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never)

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins?userId=nonexistent', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Admin record not found')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/offices/1/admins?userId=user-456', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})
