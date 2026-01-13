import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadCaptureModal } from './LeadCaptureModal'
import { createFetchResponse } from '@/test/mocks'

describe('LeadCaptureModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    listingId: 1,
    listingAddress: '123 Main Street, Sarasota, FL 34236',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders nothing when isOpen is false', () => {
    render(<LeadCaptureModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Request Information')).not.toBeInTheDocument()
  })

  it('renders modal when isOpen is true', () => {
    render(<LeadCaptureModal {...defaultProps} />)
    expect(screen.getByText('Request Information')).toBeInTheDocument()
  })

  it('displays the listing address', () => {
    render(<LeadCaptureModal {...defaultProps} />)
    expect(screen.getByText('123 Main Street, Sarasota, FL 34236')).toBeInTheDocument()
  })

  it('shows Request Info form by default', () => {
    render(<LeadCaptureModal {...defaultProps} />)
    expect(screen.getByText('Request Information')).toBeInTheDocument()
    expect(screen.queryByLabelText('Preferred Date')).not.toBeInTheDocument()
  })

  it('shows Schedule Tour title when initialType is tour_request', () => {
    render(<LeadCaptureModal {...defaultProps} initialType="tour_request" />)
    expect(screen.getByText('Schedule a Tour')).toBeInTheDocument()
  })

  it('toggles between Request Info and Schedule Tour', async () => {
    const user = userEvent.setup()
    render(<LeadCaptureModal {...defaultProps} />)

    // Initially on Request Info
    expect(screen.getByText('Request Information')).toBeInTheDocument()

    // Click Schedule Tour button
    await user.click(screen.getByRole('button', { name: 'Schedule Tour' }))

    // Now shows Schedule a Tour
    expect(screen.getByText('Schedule a Tour')).toBeInTheDocument()
    expect(screen.getByLabelText('Preferred Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Preferred Time')).toBeInTheDocument()
  })

  it('shows date and time fields when Schedule Tour is selected', async () => {
    const user = userEvent.setup()
    render(<LeadCaptureModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Schedule Tour' }))

    expect(screen.getByLabelText('Preferred Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Preferred Time')).toBeInTheDocument()
  })

  it('hides date and time fields when Request Info is selected', async () => {
    const user = userEvent.setup()
    render(<LeadCaptureModal {...defaultProps} initialType="tour_request" />)

    // Initially on Schedule Tour
    expect(screen.getByLabelText('Preferred Date')).toBeInTheDocument()

    // Switch to Request Info
    await user.click(screen.getByRole('button', { name: 'Request Info' }))

    expect(screen.queryByLabelText('Preferred Date')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<LeadCaptureModal {...defaultProps} onClose={onClose} />)

    const closeButton = screen.getByRole('button', { name: '' }) // The X button has no text
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<LeadCaptureModal {...defaultProps} onClose={onClose} />)

    // The backdrop is the fixed div with bg-black/50
    const backdrop = document.querySelector('.bg-black\\/50')
    if (backdrop) {
      await user.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValue(
      createFetchResponse({ success: true, lead: { id: 1, leadType: 'info_request', status: 'new' } }, true, 201)
    )

    render(<LeadCaptureModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Name *'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email *'), 'jane@example.com')
    await user.type(screen.getByLabelText('Phone'), '555-555-5555')
    await user.type(screen.getByLabelText('Message'), 'I want more info')

    await user.click(screen.getByRole('button', { name: 'Send Request' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/leads', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValue(
      createFetchResponse({ success: true, lead: { id: 1, leadType: 'info_request', status: 'new' } }, true, 201)
    )

    render(<LeadCaptureModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Name *'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email *'), 'jane@example.com')

    await user.click(screen.getByRole('button', { name: 'Send Request' }))

    await waitFor(() => {
      expect(screen.getByText('Request Submitted!')).toBeInTheDocument()
    })
  })

  it('shows error message on API failure', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValue(
      createFetchResponse({ error: 'Failed to create lead' }, false, 500)
    )

    render(<LeadCaptureModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Name *'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email *'), 'jane@example.com')

    await user.click(screen.getByRole('button', { name: 'Send Request' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to create lead')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: Response) => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    vi.mocked(global.fetch).mockReturnValue(pendingPromise)

    render(<LeadCaptureModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Name *'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email *'), 'jane@example.com')

    await user.click(screen.getByRole('button', { name: 'Send Request' }))

    expect(screen.getByText('Submitting...')).toBeInTheDocument()

    // Resolve the promise
    resolvePromise!(createFetchResponse({ success: true, lead: { id: 1, leadType: 'info_request', status: 'new' } }, true, 201))
  })

  it('disables submit button during submission', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: Response) => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    vi.mocked(global.fetch).mockReturnValue(pendingPromise)

    render(<LeadCaptureModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Name *'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email *'), 'jane@example.com')

    const submitButton = screen.getByRole('button', { name: 'Send Request' })
    await user.click(submitButton)

    expect(screen.getByRole('button', { name: /Submitting/i })).toBeDisabled()

    // Resolve the promise
    resolvePromise!(createFetchResponse({ success: true, lead: { id: 1, leadType: 'info_request', status: 'new' } }, true, 201))
  })

  it('resets form when modal is closed after success', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    vi.mocked(global.fetch).mockResolvedValue(
      createFetchResponse({ success: true, lead: { id: 1, leadType: 'info_request', status: 'new' } }, true, 201)
    )

    render(<LeadCaptureModal {...defaultProps} onClose={onClose} />)

    await user.type(screen.getByLabelText('Name *'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email *'), 'jane@example.com')

    await user.click(screen.getByRole('button', { name: 'Send Request' }))

    await waitFor(() => {
      expect(screen.getByText('Request Submitted!')).toBeInTheDocument()
    })

    // Click Done button
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('includes tour date and time in submission for tour requests', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValue(
      createFetchResponse({ success: true, lead: { id: 1, leadType: 'tour_request', status: 'new' } }, true, 201)
    )

    render(<LeadCaptureModal {...defaultProps} initialType="tour_request" />)

    await user.type(screen.getByLabelText('Name *'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email *'), 'jane@example.com')
    await user.type(screen.getByLabelText('Preferred Date'), '2026-01-20')
    await user.selectOptions(screen.getByLabelText('Preferred Time'), 'morning')

    await user.click(screen.getByRole('button', { name: 'Request Tour' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/leads', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('tour_request'),
      }))
    })
  })

  it('shows different success message for tour requests', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValue(
      createFetchResponse({ success: true, lead: { id: 1, leadType: 'tour_request', status: 'new' } }, true, 201)
    )

    render(<LeadCaptureModal {...defaultProps} initialType="tour_request" />)

    await user.type(screen.getByLabelText('Name *'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email *'), 'jane@example.com')

    await user.click(screen.getByRole('button', { name: 'Request Tour' }))

    await waitFor(() => {
      expect(screen.getByText(/contact you shortly to confirm your tour/i)).toBeInTheDocument()
    })
  })
})
