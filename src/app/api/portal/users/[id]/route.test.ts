import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from './route'
import { mockPortalUser } from '@/test/mocks'

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
      agents: {
        findFirst: vi.fn(),
      },
      officeAdmins: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user details for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      ...mockPortalUser,
      role: 'super_admin',
    })

    const request = new NextRequest('http://localhost/api/portal/users/user-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user.email).toBe('admin@example.com')
    expect(data.user.role).toBe('super_admin')
  })

  it('returns user with agent info when role is agent', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      ...mockPortalUser,
      role: 'agent',
    })

    vi.mocked(db.query.agents.findFirst).mockResolvedValue({
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '555-1234',
      licenseNum: 'LIC123',
    })

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/portal/users/user-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user.agentInfo).toBeDefined()
    expect(data.user.agentInfo.firstName).toBe('John')
    expect(data.user.agentInfo.leadCount).toBe(5)
  })

  it('returns user with managed offices when role is office_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      ...mockPortalUser,
      role: 'office_admin',
    })

    vi.mocked(db.query.officeAdmins.findMany).mockResolvedValue([
      {
        userId: 'user-123',
        officeId: 1,
        office: {
          id: 1,
          name: 'Test Office',
          brokerageName: 'Test Brokerage',
          city: 'Miami',
          state: 'FL',
        },
      },
    ])

    const request = new NextRequest('http://localhost/api/portal/users/user-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user.managedOffices).toHaveLength(1)
    expect(data.user.managedOffices[0].name).toBe('Test Office')
  })

  it('returns 404 when user not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/users/nonexistent')
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/users/user-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})

describe('PATCH /api/portal/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates user name and role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst)
      .mockResolvedValueOnce({ ...mockPortalUser, role: 'agent' })
      .mockResolvedValueOnce({ ...mockPortalUser, name: 'New Name', role: 'office_admin' })

    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    }))
    vi.mocked(db.update).mockImplementation(mockUpdate)

    // Mock the agents update for unlinking
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/portal/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name', role: 'office_admin' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user.name).toBe('New Name')
    expect(data.user.role).toBe('office_admin')
  })

  it('prevents changing own role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockPortalUser)

    const request = new NextRequest('http://localhost/api/portal/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'agent' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Cannot change your own role')
  })

  it('allows updating own name', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst)
      .mockResolvedValueOnce(mockPortalUser)
      .mockResolvedValueOnce({ ...mockPortalUser, name: 'New Name' })

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/portal/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user.name).toBe('New Name')
  })

  it('returns 400 for invalid role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockPortalUser)

    const request = new NextRequest('http://localhost/api/portal/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'invalid_role' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid role')
  })

  it('returns 404 when user not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/users/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })
})

describe('DELETE /api/portal/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes user successfully', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      ...mockPortalUser,
      role: 'office_admin',
    })

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    } as never)

    const request = new NextRequest('http://localhost/api/portal/users/user-123', {
      method: 'DELETE',
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('unlinks agent when deleting agent user', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      ...mockPortalUser,
      role: 'agent',
    })

    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    }))
    vi.mocked(db.update).mockImplementation(mockUpdate)

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    } as never)

    const request = new NextRequest('http://localhost/api/portal/users/user-123', {
      method: 'DELETE',
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('prevents self-deletion', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const request = new NextRequest('http://localhost/api/portal/users/user-123', {
      method: 'DELETE',
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Cannot delete your own account')
  })

  it('returns 404 when user not found', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'admin-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portal/users/nonexistent', {
      method: 'DELETE',
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })
})
