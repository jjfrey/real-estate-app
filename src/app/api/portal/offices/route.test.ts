import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { mockOfficeWithStats } from '@/test/mocks'

// Mock portal auth
vi.mock('@/lib/portal-auth', () => ({
  requirePortalRole: vi.fn(),
  getAccessibleOfficeIds: vi.fn(),
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
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(),
      })),
    })),
  },
}))

import { requirePortalRole, getAccessibleOfficeIds } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/offices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns offices list for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })
    vi.mocked(getAccessibleOfficeIds).mockReturnValue(null) // null = super_admin has access to all

    const mockOrderBy = vi.fn().mockResolvedValue([mockOfficeWithStats])
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.offices).toHaveLength(1)
    expect(data.offices[0].name).toBe('ABC Realty')
    expect(data.offices[0].listingCount).toBe(25)
    expect(data.offices[0].adminCount).toBe(2)
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

  it('returns empty array when no offices exist', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })
    vi.mocked(getAccessibleOfficeIds).mockReturnValue(null) // null = super_admin has access to all

    const mockOrderBy = vi.fn().mockResolvedValue([])
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.offices).toHaveLength(0)
  })

  it('requires company_admin or super_admin role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })
    vi.mocked(getAccessibleOfficeIds).mockReturnValue(null)

    const mockOrderBy = vi.fn().mockResolvedValue([])
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

    await GET()

    expect(requirePortalRole).toHaveBeenCalledWith(['company_admin', 'super_admin'])
  })
})
