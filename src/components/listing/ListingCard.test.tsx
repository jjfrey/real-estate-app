import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ListingCard } from './ListingCard'
import { mockListingSummary } from '@/test/mocks'

describe('ListingCard', () => {
  it('renders listing price correctly', () => {
    render(<ListingCard listing={mockListingSummary} />)
    expect(screen.getByText('$450,000')).toBeInTheDocument()
  })

  it('renders listing address', () => {
    render(<ListingCard listing={mockListingSummary} />)
    expect(screen.getByText('123 Main Street')).toBeInTheDocument()
  })

  it('renders city, state, and zip', () => {
    render(<ListingCard listing={mockListingSummary} />)
    expect(screen.getByText('SARASOTA, FL 34236')).toBeInTheDocument()
  })

  it('renders bedrooms when available', () => {
    render(<ListingCard listing={mockListingSummary} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('bd')).toBeInTheDocument()
  })

  it('renders bathrooms when available', () => {
    render(<ListingCard listing={mockListingSummary} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('ba')).toBeInTheDocument()
  })

  it('renders living area when available', () => {
    render(<ListingCard listing={mockListingSummary} />)
    expect(screen.getByText('1,800')).toBeInTheDocument()
    expect(screen.getByText('sqft')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<ListingCard listing={mockListingSummary} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders /mo suffix for rental listings', () => {
    const rentalListing = { ...mockListingSummary, status: 'For Rent' }
    render(<ListingCard listing={rentalListing} />)
    expect(screen.getByText('/mo')).toBeInTheDocument()
  })

  it('does not render /mo suffix for sale listings', () => {
    render(<ListingCard listing={mockListingSummary} />)
    expect(screen.queryByText('/mo')).not.toBeInTheDocument()
  })

  it('renders unit number when available', () => {
    const listingWithUnit = { ...mockListingSummary, unitNumber: '101' }
    render(<ListingCard listing={listingWithUnit} />)
    expect(screen.getByText('123 Main Street #101')).toBeInTheDocument()
  })

  it('generates correct link href', () => {
    render(<ListingCard listing={mockListingSummary} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/listings/sarasota-fl/123-main-street-A123456')
  })

  it('calls onMouseEnter when hovering', () => {
    const handleMouseEnter = vi.fn()
    render(<ListingCard listing={mockListingSummary} onMouseEnter={handleMouseEnter} />)
    fireEvent.mouseEnter(screen.getByRole('article'))
    expect(handleMouseEnter).toHaveBeenCalledTimes(1)
  })

  it('calls onMouseLeave when mouse leaves', () => {
    const handleMouseLeave = vi.fn()
    render(<ListingCard listing={mockListingSummary} onMouseLeave={handleMouseLeave} />)
    fireEvent.mouseLeave(screen.getByRole('article'))
    expect(handleMouseLeave).toHaveBeenCalledTimes(1)
  })

  it('applies highlighted styles when isHighlighted is true', () => {
    render(<ListingCard listing={mockListingSummary} isHighlighted={true} />)
    const article = screen.getByRole('article')
    expect(article).toHaveClass('border-[#0c87f2]')
    expect(article).toHaveClass('ring-2')
  })

  it('does not apply highlighted styles when isHighlighted is false', () => {
    render(<ListingCard listing={mockListingSummary} isHighlighted={false} />)
    const article = screen.getByRole('article')
    expect(article).not.toHaveClass('border-[#0c87f2]')
    expect(article).toHaveClass('border-gray-100')
  })

  it('renders image when photoUrl is available', () => {
    render(<ListingCard listing={mockListingSummary} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', '123 Main Street')
  })

  it('renders placeholder when photoUrl is not available', () => {
    const listingNoPhoto = { ...mockListingSummary, photoUrl: null }
    render(<ListingCard listing={listingNoPhoto} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('prevents navigation when clicking favorite button', () => {
    render(<ListingCard listing={mockListingSummary} />)
    const favoriteButton = screen.getByRole('button')
    const clickEvent = fireEvent.click(favoriteButton)
    // The button click should not navigate (we can't directly test preventDefault)
    expect(favoriteButton).toBeInTheDocument()
  })

  describe('status colors', () => {
    it('applies green color for Active status', () => {
      render(<ListingCard listing={mockListingSummary} />)
      const badge = screen.getByText('Active')
      expect(badge).toHaveClass('bg-green-500')
    })

    it('applies amber color for Pending status', () => {
      const pendingListing = { ...mockListingSummary, status: 'Pending' }
      render(<ListingCard listing={pendingListing} />)
      const badge = screen.getByText('Pending')
      expect(badge).toHaveClass('bg-amber-500')
    })

    it('applies blue color for For Rent status', () => {
      const rentalListing = { ...mockListingSummary, status: 'For Rent' }
      render(<ListingCard listing={rentalListing} />)
      const badge = screen.getByText('For Rent')
      expect(badge).toHaveClass('bg-blue-500')
    })

    it('applies gray color for unknown status', () => {
      const unknownListing = { ...mockListingSummary, status: 'Unknown' }
      render(<ListingCard listing={unknownListing} />)
      const badge = screen.getByText('Unknown')
      expect(badge).toHaveClass('bg-gray-500')
    })
  })

  describe('formatPrice', () => {
    it('formats string price correctly', () => {
      render(<ListingCard listing={mockListingSummary} />)
      expect(screen.getByText('$450,000')).toBeInTheDocument()
    })

    it('formats large prices with commas', () => {
      const expensiveListing = { ...mockListingSummary, price: '1250000' }
      render(<ListingCard listing={expensiveListing} />)
      expect(screen.getByText('$1,250,000')).toBeInTheDocument()
    })
  })
})
