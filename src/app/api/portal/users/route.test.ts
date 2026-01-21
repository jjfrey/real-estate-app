import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
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

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
  },
}))

// Mock email
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock the database
vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      agents: {
        findFirst: vi.fn(),
      },
      offices: {
        findFirst: vi.fn(),
      },
      officeAdmins: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn(),
      }),
    }),
  },
}))

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'
import { sendWelcomeEmail } from '@/lib/email'

function createRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/portal/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

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

describe('POST /api/portal/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock for insert chain
    const mockReturning = vi.fn().mockResolvedValue([{
      id: 'new-user-id',
      email: 'new@example.com',
      name: 'New User',
      role: 'agent',
      createdAt: new Date('2024-01-01'),
    }])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<typeof db.insert>)
  })

  it('creates a new user successfully', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'agent',
    }))

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.user.email).toBe('new@example.com')
    expect(data.user.role).toBe('agent')
  })

  it('returns 400 for missing required fields', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })

    const response = await POST(createRequest({
      email: 'new@example.com',
      // missing name, password, role
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Email, name, password, and role are required')
  })

  it('returns 400 for invalid email format', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })

    const response = await POST(createRequest({
      email: 'invalid-email',
      name: 'New User',
      password: 'password123',
      role: 'agent',
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid email format')
  })

  it('returns 400 for password too short', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'short',
      role: 'agent',
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Password must be at least 8 characters')
  })

  it('returns 400 for invalid role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'invalid_role',
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Role must be agent, office_admin, or super_admin')
  })

  it('returns 400 for duplicate email', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'existing-user',
      email: 'new@example.com',
      name: 'Existing User',
      role: 'agent',
    })

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'agent',
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('A user with this email already exists')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'agent',
    }))

    expect(response.status).toBe(401)
  })

  it('returns 403 when not super_admin', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 403, message: 'Forbidden' })

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'agent',
    }))

    expect(response.status).toBe(403)
  })

  it('sends welcome email when sendWelcome is true', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'agent',
      sendWelcome: true,
    }))

    expect(response.status).toBe(201)
    expect(sendWelcomeEmail).toHaveBeenCalled()
    const data = await response.json()
    expect(data.emailSent).toBe(true)
  })

  it('does not send email when sendWelcome is false', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'agent',
      sendWelcome: false,
    }))

    expect(response.status).toBe(201)
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
    const data = await response.json()
    expect(data.emailSent).toBe(false)
  })

  it('returns 404 when agent not found for agent role with agentId', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)
    vi.mocked(db.query.agents.findFirst).mockResolvedValue(null)

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'agent',
      agentId: 999,
    }))

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Agent not found')
  })

  it('returns 400 when agent already has a user', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)
    vi.mocked(db.query.agents.findFirst).mockResolvedValue({
      ...mockAgent,
      userId: 'existing-user',
    })

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'agent',
      agentId: mockAgent.id,
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Agent already has a portal account')
  })

  it('returns 404 when office not found for office_admin role with officeId', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' as const },
    })
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)
    vi.mocked(db.query.offices.findFirst).mockResolvedValue(null)

    const response = await POST(createRequest({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      role: 'office_admin',
      officeId: 999,
    }))

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Office not found')
  })
})
