import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactAgentCard } from './ContactAgentCard'

// Mock the LeadCaptureModal to avoid testing it here
vi.mock('./LeadCaptureModal', () => ({
  LeadCaptureModal: vi.fn(({ isOpen, onClose, initialType }) =>
    isOpen ? (
      <div data-testid="mock-modal" data-type={initialType}>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}))

describe('ContactAgentCard', () => {
  const mockAgent = {
    firstName: 'John',
    lastName: 'Smith',
    photoUrl: 'https://example.com/agent.jpg',
    phone: '555-123-4567',
  }

  const mockOffice = {
    brokerageName: 'ABC Realty',
  }

  const defaultProps = {
    listingId: 1,
    listingAddress: '123 Main Street, Sarasota, FL 34236',
    agent: mockAgent,
    office: mockOffice,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Contact Agent heading', () => {
    render(<ContactAgentCard {...defaultProps} />)
    expect(screen.getByText('Contact Agent')).toBeInTheDocument()
  })

  it('renders agent name when agent is provided', () => {
    render(<ContactAgentCard {...defaultProps} />)
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('renders office brokerage name when office is provided', () => {
    render(<ContactAgentCard {...defaultProps} />)
    expect(screen.getByText('ABC Realty')).toBeInTheDocument()
  })

  it('renders agent photo when photoUrl is provided', () => {
    render(<ContactAgentCard {...defaultProps} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'John Smith')
  })

  it('renders placeholder when agent has no photo', () => {
    const agentNoPhoto = { ...mockAgent, photoUrl: null }
    render(<ContactAgentCard {...defaultProps} agent={agentNoPhoto} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders phone number when agent has phone', () => {
    render(<ContactAgentCard {...defaultProps} />)
    const phoneLink = screen.getByRole('link', { name: '555-123-4567' })
    expect(phoneLink).toHaveAttribute('href', 'tel:555-123-4567')
  })

  it('does not render phone when agent has no phone', () => {
    const agentNoPhone = { ...mockAgent, phone: null }
    render(<ContactAgentCard {...defaultProps} agent={agentNoPhone} />)
    expect(screen.queryByRole('link', { name: /555/ })).not.toBeInTheDocument()
  })

  it('renders Request Info button', () => {
    render(<ContactAgentCard {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Request Info' })).toBeInTheDocument()
  })

  it('renders Schedule Tour button', () => {
    render(<ContactAgentCard {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Schedule Tour' })).toBeInTheDocument()
  })

  it('opens modal with info_request type when Request Info is clicked', async () => {
    const user = userEvent.setup()
    render(<ContactAgentCard {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Request Info' }))

    const modal = screen.getByTestId('mock-modal')
    expect(modal).toBeInTheDocument()
    expect(modal).toHaveAttribute('data-type', 'info_request')
  })

  it('opens modal with tour_request type when Schedule Tour is clicked', async () => {
    const user = userEvent.setup()
    render(<ContactAgentCard {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Schedule Tour' }))

    const modal = screen.getByTestId('mock-modal')
    expect(modal).toBeInTheDocument()
    expect(modal).toHaveAttribute('data-type', 'tour_request')
  })

  it('closes modal when onClose is called', async () => {
    const user = userEvent.setup()
    render(<ContactAgentCard {...defaultProps} />)

    // Open modal
    await user.click(screen.getByRole('button', { name: 'Request Info' }))
    expect(screen.getByTestId('mock-modal')).toBeInTheDocument()

    // Close modal
    await user.click(screen.getByRole('button', { name: 'Close Modal' }))
    expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument()
  })

  it('does not render agent section when agent is null', () => {
    render(<ContactAgentCard {...defaultProps} agent={null} />)
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument()
  })

  it('still renders buttons when agent is null', () => {
    render(<ContactAgentCard {...defaultProps} agent={null} />)
    expect(screen.getByRole('button', { name: 'Request Info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schedule Tour' })).toBeInTheDocument()
  })

  it('does not render brokerage when office is null', () => {
    render(<ContactAgentCard {...defaultProps} office={null} />)
    expect(screen.queryByText('ABC Realty')).not.toBeInTheDocument()
  })
})
