import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock portal auth
vi.mock('@/lib/portal-auth', () => ({
  requirePortalRole: vi.fn(),
  portalAuthErrorResponse: vi.fn((error) => {
    if (error?.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
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
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}))

// Mock feature flags cache
vi.mock('@/lib/feature-flags', () => ({
  clearFlagsCache: vi.fn(),
}))

// Mock drizzle-orm
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    eq: vi.fn(),
  }
})

import { requirePortalRole } from '@/lib/portal-auth'
import { db } from '@/db'
import { clearFlagsCache } from '@/lib/feature-flags'
import { GET, POST, PATCH, DELETE } from './route'

const mockFlag = {
  id: 1,
  key: 'test_flag',
  description: 'A test flag',
  enabledGlobal: false,
  enabledSites: null,
  rolloutPercentage: 100,
  metadata: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('Feature Flags API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePortalRole).mockResolvedValue({} as never)
  })

  describe('GET /api/portal/feature-flags', () => {
    it('returns all feature flags', async () => {
      const flags = [mockFlag, { ...mockFlag, id: 2, key: 'flag_b' }]
      const orderByFn = vi.fn().mockResolvedValue(flags)
      const fromFn = vi.fn().mockReturnValue({ orderBy: orderByFn })
      vi.mocked(db.select).mockReturnValue({ from: fromFn } as never)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(requirePortalRole).toHaveBeenCalledWith(['super_admin'])
    })

    it('requires super_admin role', async () => {
      const authError = new Error('Unauthorized')
      vi.mocked(requirePortalRole).mockRejectedValue(authError)

      const response = await GET()

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/portal/feature-flags', () => {
    it('creates a new feature flag', async () => {
      const returningFn = vi.fn().mockResolvedValue([mockFlag])
      const valuesFn = vi.fn().mockReturnValue({ returning: returningFn })
      vi.mocked(db.insert).mockReturnValue({ values: valuesFn } as never)

      const request = new NextRequest('http://localhost/api/portal/feature-flags', {
        method: 'POST',
        body: JSON.stringify({ key: 'test_flag', description: 'A test flag' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.key).toBe('test_flag')
      expect(clearFlagsCache).toHaveBeenCalled()
    })

    it('returns 400 when key is missing', async () => {
      const request = new NextRequest('http://localhost/api/portal/feature-flags', {
        method: 'POST',
        body: JSON.stringify({ description: 'No key provided' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Key is required')
    })

    it('returns 400 when key is not a string', async () => {
      const request = new NextRequest('http://localhost/api/portal/feature-flags', {
        method: 'POST',
        body: JSON.stringify({ key: 123 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Key is required')
    })

    it('creates flag with enabledSites as JSON string', async () => {
      const flagWithSites = { ...mockFlag, enabledSites: '["distinct"]' }
      const returningFn = vi.fn().mockResolvedValue([flagWithSites])
      const valuesFn = vi.fn().mockReturnValue({ returning: returningFn })
      vi.mocked(db.insert).mockReturnValue({ values: valuesFn } as never)

      const request = new NextRequest('http://localhost/api/portal/feature-flags', {
        method: 'POST',
        body: JSON.stringify({ key: 'test_flag', enabledSites: ['distinct'] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          enabledSites: '["distinct"]',
        })
      )
    })
  })

  describe('PATCH /api/portal/feature-flags', () => {
    it('updates an existing feature flag', async () => {
      const updatedFlag = { ...mockFlag, enabledGlobal: true }
      const returningFn = vi.fn().mockResolvedValue([updatedFlag])
      const whereFn = vi.fn().mockReturnValue({ returning: returningFn })
      const setFn = vi.fn().mockReturnValue({ where: whereFn })
      vi.mocked(db.update).mockReturnValue({ set: setFn } as never)

      const request = new NextRequest('http://localhost/api/portal/feature-flags', {
        method: 'PATCH',
        body: JSON.stringify({ id: 1, enabledGlobal: true }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.enabledGlobal).toBe(true)
      expect(clearFlagsCache).toHaveBeenCalled()
    })

    it('returns 400 when id is missing', async () => {
      const request = new NextRequest('http://localhost/api/portal/feature-flags', {
        method: 'PATCH',
        body: JSON.stringify({ enabledGlobal: true }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ID is required')
    })

    it('returns 404 when flag not found', async () => {
      const returningFn = vi.fn().mockResolvedValue([])
      const whereFn = vi.fn().mockReturnValue({ returning: returningFn })
      const setFn = vi.fn().mockReturnValue({ where: whereFn })
      vi.mocked(db.update).mockReturnValue({ set: setFn } as never)

      const request = new NextRequest('http://localhost/api/portal/feature-flags', {
        method: 'PATCH',
        body: JSON.stringify({ id: 999, enabledGlobal: true }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Flag not found')
    })
  })

  describe('DELETE /api/portal/feature-flags', () => {
    it('deletes a feature flag', async () => {
      const returningFn = vi.fn().mockResolvedValue([mockFlag])
      const whereFn = vi.fn().mockReturnValue({ returning: returningFn })
      vi.mocked(db.delete).mockReturnValue({ where: whereFn } as never)

      const request = new NextRequest('http://localhost/api/portal/feature-flags?id=1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(clearFlagsCache).toHaveBeenCalled()
    })

    it('returns 400 when id is missing', async () => {
      const request = new NextRequest('http://localhost/api/portal/feature-flags', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ID is required')
    })

    it('returns 404 when flag not found', async () => {
      const returningFn = vi.fn().mockResolvedValue([])
      const whereFn = vi.fn().mockReturnValue({ returning: returningFn })
      vi.mocked(db.delete).mockReturnValue({ where: whereFn } as never)

      const request = new NextRequest('http://localhost/api/portal/feature-flags?id=999', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Flag not found')
    })
  })
})
