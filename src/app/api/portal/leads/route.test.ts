import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
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
  getAccessibleOfficeIds: vi.fn(),
}))

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    offset: vi.fn(),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
  },
}))

import { requirePortalRole, getAccessibleOfficeIds } from '@/lib/portal-auth'
import { db } from '@/db'

describe('GET /api/portal/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns leads list for super_admin', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    // Mock the count query
    const mockWhere = vi.fn().mockResolvedValue([{ total: 1 }])
    const mockFrom = vi.fn(() => ({ where: mockWhere }))

    // Mock the leads query
    const mockOffset = vi.fn().mockResolvedValue([{
      id: 1,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-555-5555',
      leadType: 'info_request',
      message: 'Test',
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
      listingPrice: '450000',
      listingMlsId: 'A123',
      agentId: 1,
      agentFirstName: 'John',
      agentLastName: 'Smith',
      officeId: 1,
      officeName: 'ABC Realty',
    }])

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Count query
        return { from: mockFrom } as never
      }
      // Leads query
      return {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      offset: mockOffset,
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      } as never
    })

    const request = new NextRequest('http://localhost/api/portal/leads')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.leads).toHaveLength(1)
    expect(data.leads[0].name).toBe('Jane Doe')
    expect(data.pagination).toBeDefined()
  })

  it('filters leads by agent for agent role', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-789', email: 'agent@example.com', name: 'Agent', role: 'agent' },
      agent: { id: 42, firstName: 'John', lastName: 'Smith' },
    })

    const mockWhere = vi.fn().mockResolvedValue([{ total: 0 }])
    const mockFrom = vi.fn(() => ({ where: mockWhere }))

    const mockOffset = vi.fn().mockResolvedValue([])

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return { from: mockFrom } as never
      }
      return {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      offset: mockOffset,
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      } as never
    })

    const request = new NextRequest('http://localhost/api/portal/leads')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.leads).toHaveLength(0)
  })

  it('returns empty for office_admin with no offices', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-456', email: 'officeadmin@example.com', name: 'Office Admin', role: 'office_admin' },
    })
    vi.mocked(getAccessibleOfficeIds).mockReturnValue([])

    const request = new NextRequest('http://localhost/api/portal/leads')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.leads).toHaveLength(0)
    expect(data.pagination.total).toBe(0)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requirePortalRole).mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const request = new NextRequest('http://localhost/api/portal/leads')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('supports pagination parameters', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const mockWhere = vi.fn().mockResolvedValue([{ total: 50 }])
    const mockFrom = vi.fn(() => ({ where: mockWhere }))
    const mockOffset = vi.fn().mockResolvedValue([])

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return { from: mockFrom } as never
      }
      return {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      offset: mockOffset,
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      } as never
    })

    const request = new NextRequest('http://localhost/api/portal/leads?page=2&limit=10')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.page).toBe(2)
    expect(data.pagination.limit).toBe(10)
    expect(data.pagination.totalPages).toBe(5)
  })

  it('supports status filter', async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: 'user-123', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
    })

    const mockWhere = vi.fn().mockResolvedValue([{ total: 5 }])
    const mockFrom = vi.fn(() => ({ where: mockWhere }))
    const mockOffset = vi.fn().mockResolvedValue([])

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return { from: mockFrom } as never
      }
      return {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      offset: mockOffset,
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      } as never
    })

    const request = new NextRequest('http://localhost/api/portal/leads?status=new')
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})
