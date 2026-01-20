import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { mockPortalUser, mockOfficeAdmin, mockAgent, mockOffice } from '@/test/mocks'

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
        findMany: vi.fn(),
      },
      agents: {
        findFirst: vi.fn(),
      },
      officeAdmins: {
        findMany: vi.fn(),
      },
    },
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns users list for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findMany).mockResolvedValue([mockPortalUser])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users).toHaveLength(1)
    expect(data.users[0].email).toBe('admin@example.com')
    expect(data.users[0].role).toBe('super_admin')
  })

  it('returns agent info for agent users', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const agentUser = {
      id: 'user-789',
      email: 'agent@example.com',
      name: 'Agent User',
      role: 'agent',
      createdAt: new Date('2024-01-01'),
    }

    vi.mocked(db.query.users.findMany).mockResolvedValue([agentUser])
    vi.mocked(db.query.agents.findFirst).mockResolvedValue(mockAgent)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users).toHaveLength(1)
    expect(data.users[0].agentInfo).toBeDefined()
    expect(data.users[0].agentInfo.firstName).toBe('John')
    expect(data.users[0].agentInfo.lastName).toBe('Smith')
  })

  it('returns managed offices for office_admin users', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findMany).mockResolvedValue([mockOfficeAdmin])
    vi.mocked(db.query.officeAdmins.findMany).mockResolvedValue([
      {
        office: {
          id: mockOffice.id,
          name: mockOffice.name,
          brokerageName: mockOffice.brokerageName,
        },
      },
    ])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users).toHaveLength(1)
    expect(data.users[0].managedOffices).toHaveLength(1)
    expect(data.users[0].managedOffices[0].name).toBe('ABC Realty')
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

  it('returns empty array when no portal users exist', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findMany).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users).toHaveLength(0)
  })

  it('handles agent user without agent record', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const agentUser = {
      id: 'user-789',
      email: 'agent@example.com',
      name: 'Agent User',
      role: 'agent',
      createdAt: new Date('2024-01-01'),
    }

    vi.mocked(db.query.users.findMany).mockResolvedValue([agentUser])
    vi.mocked(db.query.agents.findFirst).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users[0].agentInfo).toBeNull()
  })

  it('requires super_admin role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    vi.mocked(db.query.users.findMany).mockResolvedValue([])

    await GET()

    expect(requirePortalRole).toHaveBeenCalledWith(['super_admin'])
  })
})
