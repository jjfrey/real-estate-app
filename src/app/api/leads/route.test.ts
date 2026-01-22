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

// Mock the email module
vi.mock('@/lib/email', () => ({
  sendLeadNotificationEmail: vi.fn().mockResolvedValue({ success: true, id: 'test-email-id' }),
}))

import { db } from '@/db'
import { sendLeadNotificationEmail } from '@/lib/email'

// Full listing mock with agent and office relations
const mockListingWithRelations = {
  id: 1,
  agentId: 1,
  officeId: 1,
  streetAddress: '123 Main St',
  city: 'Miami',
  state: 'FL',
  listPrice: '500000',
  mlsId: 'MLS123',
  agent: {
    id: 1,
    email: 'agent@example.com',
    firstName: 'John',
    lastName: 'Agent',
  },
  office: {
    id: 1,
    routeToTeamLead: false,
    leadRoutingEmail: null,
  },
}

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a lead successfully with valid data', async () => {
    vi.mocked(db.query.listings.findFirst).mockResolvedValue(mockListingWithRelations)

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
    vi.mocked(db.query.listings.findFirst).mockResolvedValue(mockListingWithRelations)

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
    vi.mocked(db.query.listings.findFirst).mockResolvedValue(mockListingWithRelations)

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

  it('sends notification email to agent when routeToTeamLead is false', async () => {
    vi.mocked(db.query.listings.findFirst).mockResolvedValue(mockListingWithRelations)

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

    await POST(request)

    expect(sendLeadNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'agent@example.com',
        leadType: 'info_request',
        leadName: mockLeadRequest.name,
        leadEmail: mockLeadRequest.email,
      })
    )
  })

  it('sends notification email to leadRoutingEmail when routeToTeamLead is true', async () => {
    const listingWithTeamLead = {
      ...mockListingWithRelations,
      office: {
        id: 1,
        routeToTeamLead: true,
        leadRoutingEmail: 'teamlead@example.com',
      },
    }
    vi.mocked(db.query.listings.findFirst).mockResolvedValue(listingWithTeamLead)

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

    await POST(request)

    expect(sendLeadNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'teamlead@example.com',
      })
    )
  })

  it('still creates lead even if email fails', async () => {
    vi.mocked(db.query.listings.findFirst).mockResolvedValue(mockListingWithRelations)
    vi.mocked(sendLeadNotificationEmail).mockRejectedValueOnce(new Error('Email failed'))

    const insertMock = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([mockLead]),
      })),
    }))
    vi.mocked(db.insert).mockImplementation(insertMock)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = new NextRequest('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify(mockLeadRequest),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)

    consoleSpy.mockRestore()
  })

  it('does not send email when no recipient available', async () => {
    const listingNoRecipient = {
      ...mockListingWithRelations,
      agent: { id: 1, email: null, firstName: null, lastName: null },
      office: { id: 1, routeToTeamLead: false, leadRoutingEmail: null },
    }
    vi.mocked(db.query.listings.findFirst).mockResolvedValue(listingNoRecipient)

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
    expect(sendLeadNotificationEmail).not.toHaveBeenCalled()
  })
})
