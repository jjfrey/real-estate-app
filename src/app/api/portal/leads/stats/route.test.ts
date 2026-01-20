import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

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
  getAccessibleOfficeIds: vi.fn(),
}))

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
        groupBy: vi.fn(),
      })),
    })),
  },
}))

import { requirePortalRole, getAccessibleOfficeIds } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/leads/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns lead stats for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Total count
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ total: 100 }]),
          })),
        } as never
      } else if (callCount === 2) {
        // Status counts
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn().mockResolvedValue([
                { status: 'new', count: 50 },
                { status: 'contacted', count: 30 },
                { status: 'converted', count: 15 },
                { status: 'closed', count: 5 },
              ]),
            })),
          })),
        } as never
      } else if (callCount === 3) {
        // This week count
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ thisWeek: 25 }]),
          })),
        } as never
      } else {
        // This month count
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ thisMonth: 75 }]),
          })),
        } as never
      }
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.total).toBe(100)
    expect(data.byStatus).toBeDefined()
    expect(data.byStatus.new).toBe(50)
    expect(data.byStatus.contacted).toBe(30)
    expect(data.thisWeek).toBe(25)
    expect(data.thisMonth).toBe(75)
  })

  it('returns stats filtered by agent for agent role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-789', email: 'agent@example.com', name: 'Agent', role: 'agent' },
      agent: { id: 42, firstName: 'John', lastName: 'Smith' },
    })

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ total: 10 }]),
          })),
        } as never
      } else if (callCount === 2) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn().mockResolvedValue([
                { status: 'new', count: 5 },
                { status: 'contacted', count: 3 },
              ]),
            })),
          })),
        } as never
      } else if (callCount === 3) {
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ thisWeek: 3 }]),
          })),
        } as never
      } else {
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ thisMonth: 8 }]),
          })),
        } as never
      }
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.total).toBe(10)
  })

  it('returns empty stats for office_admin with no offices', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
    })
    vi.mocked(getAccessibleOfficeIds).mockReturnValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.total).toBe(0)
    expect(data.byStatus.new).toBe(0)
    expect(data.byStatus.contacted).toBe(0)
    expect(data.byStatus.converted).toBe(0)
    expect(data.byStatus.closed).toBe(0)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('requires proper portal roles', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as never
    })

    await GET()

    expect(requirePortalRole).toHaveBeenCalledWith(['agent', 'office_admin', 'super_admin'])
  })
})
