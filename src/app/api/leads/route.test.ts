import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { mockLeadRequest, mockTourRequest, mockLead } from '@/test/mocks'

// Mock the database
vi.mock('@/db', () => ({
  db: {
    query: {
      listings: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}))

import { db } from '@/db'

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a lead successfully with valid data', async () => {
    vi.mocked(db.query.listings.findFirst).mockResolvedValue({
      id: 1,
      agentId: 1,
      officeId: 1,
    })

    const insertMock = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([mockLead]),
      })),
    }))
    vi.mocked(db.insert).mockImplementation(insertMock)

    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify(mockLeadRequest),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.lead.id).toBe(1)
    expect(data.lead.leadType).toBe('info_request')
    expect(data.lead.status).toBe('new')
  })

  it('creates a tour request with date and time', async () => {
    vi.mocked(db.query.listings.findFirst).mockResolvedValue({
      id: 1,
      agentId: 1,
      officeId: 1,
    })

    const tourLead = {
      ...mockLead,
      leadType: 'tour_request',
      preferredTourDate: '2026-01-20',
      preferredTourTime: 'morning',
    }

    const insertMock = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([tourLead]),
      })),
    }))
    vi.mocked(db.insert).mockImplementation(insertMock)

    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify(mockTourRequest),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.lead.leadType).toBe('tour_request')
  })

  it('returns 400 when listingId is missing', async () => {
    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        leadType: 'info_request',
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 when leadType is missing', async () => {
    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 1,
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 when name is missing', async () => {
    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 1,
        leadType: 'info_request',
        email: 'jane@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 when email is missing', async () => {
    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 1,
        leadType: 'info_request',
        name: 'Jane Doe',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 for invalid leadType', async () => {
    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 1,
        leadType: 'invalid_type',
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid leadType')
  })

  it('returns 400 for invalid email format', async () => {
    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 1,
        leadType: 'info_request',
        name: 'Jane Doe',
        email: 'invalid-email',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid email format')
  })

  it('returns 404 when listing is not found', async () => {
    vi.mocked(db.query.listings.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify(mockLeadRequest),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Listing not found')
  })

  it('returns 500 on database error', async () => {
    vi.mocked(db.query.listings.findFirst).mockRejectedValue(new Error('Database error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify(mockLeadRequest),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create lead')

    consoleSpy.mockRestore()
  })

  it('accepts request without optional fields', async () => {
    vi.mocked(db.query.listings.findFirst).mockResolvedValue({
      id: 1,
      agentId: 1,
      officeId: 1,
    })

    const minimalLead = {
      ...mockLead,
      phone: null,
      message: null,
    }

    const insertMock = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([minimalLead]),
      })),
    }))
    vi.mocked(db.insert).mockImplementation(insertMock)

    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 1,
        leadType: 'info_request',
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
  })
})
