import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterPanel, FilterValues } from './FilterPanel'

const defaultFilters: FilterValues = {
  status: [],
  propertyType: [],
  minPrice: undefined,
  maxPrice: undefined,
  minBeds: undefined,
  maxBeds: undefined,
  minBaths: undefined,
  maxBaths: undefined,
}

describe('FilterPanel', () => {
  describe('rendering', () => {
    it('renders all filter sections', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      expect(screen.getByText('Listing Status')).toBeInTheDocument()
      expect(screen.getByText('Property Type')).toBeInTheDocument()
      expect(screen.getByText('Price Range')).toBeInTheDocument()
      expect(screen.getByText('Bedrooms')).toBeInTheDocument()
      expect(screen.getByText('Bathrooms')).toBeInTheDocument()
    })

    it('renders status options', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      expect(screen.getByRole('button', { name: 'For Sale' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'For Rent' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Contingent' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Coming Soon' })).toBeInTheDocument()
    })

    it('renders property type options', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      expect(screen.getByRole('button', { name: 'Single Family' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Condo' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Townhouse' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Land' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Multi-Family' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Manufactured' })).toBeInTheDocument()
    })

    it('renders bedroom options', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      // Both bedrooms and bathrooms have 'Any' button, so check for multiple
      expect(screen.getAllByRole('button', { name: 'Any' })).toHaveLength(2)
      // 1+ appears in both beds and baths
      expect(screen.getAllByRole('button', { name: '1+' })).toHaveLength(2)
      // 2+ appears in both
      expect(screen.getAllByRole('button', { name: '2+' })).toHaveLength(2)
      // 3+ appears in both
      expect(screen.getAllByRole('button', { name: '3+' })).toHaveLength(2)
      // 4+ appears in both
      expect(screen.getAllByRole('button', { name: '4+' })).toHaveLength(2)
      // 5+ only in beds
      expect(screen.getByRole('button', { name: '5+' })).toBeInTheDocument()
    })

    it('renders price dropdowns', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      const selects = screen.getAllByRole('combobox')
      expect(selects).toHaveLength(2)
    })

    it('renders reset button', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })
  })

  describe('status filter', () => {
    it('selects status when clicked', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'For Sale' }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: ['Active'] })
      )
    })

    it('shows selected status with active styling', () => {
      const onChange = vi.fn()
      const filters = { ...defaultFilters, status: ['Active'] }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      const forSaleButton = screen.getByRole('button', { name: 'For Sale' })
      expect(forSaleButton).toHaveClass('bg-[#0c87f2]')
      expect(forSaleButton).toHaveClass('text-white')
    })

    it('deselects status when clicked again', () => {
      const onChange = vi.fn()
      const filters = { ...defaultFilters, status: ['Active'] }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'For Sale' }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: [] })
      )
    })

    it('allows multiple status selections', () => {
      const onChange = vi.fn()
      const filters = { ...defaultFilters, status: ['Active'] }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'Pending' }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: ['Active', 'Pending'] })
      )
    })
  })

  describe('property type filter', () => {
    it('selects property type when clicked', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'Condo' }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ propertyType: ['Condo'] })
      )
    })

    it('shows selected property type with active styling', () => {
      const onChange = vi.fn()
      const filters = { ...defaultFilters, propertyType: ['SingleFamily'] }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      const singleFamilyButton = screen.getByRole('button', { name: 'Single Family' })
      expect(singleFamilyButton).toHaveClass('bg-[#0c87f2]')
    })

    it('allows multiple property type selections', () => {
      const onChange = vi.fn()
      const filters = { ...defaultFilters, propertyType: ['SingleFamily'] }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'Condo' }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ propertyType: ['SingleFamily', 'Condo'] })
      )
    })
  })

  describe('price filter', () => {
    it('updates min price when selected', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: '200000' } })

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 200000 })
      )
    })

    it('updates max price when selected', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[1], { target: { value: '500000' } })

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ maxPrice: 500000 })
      )
    })

    it('shows selected prices', () => {
      const onChange = vi.fn()
      const filters = { ...defaultFilters, minPrice: 300000, maxPrice: 750000 }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      const selects = screen.getAllByRole('combobox')
      expect(selects[0]).toHaveValue('300000')
      expect(selects[1]).toHaveValue('750000')
    })
  })

  describe('bedroom filter', () => {
    it('selects bedroom count when clicked', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      // Get all 3+ buttons (there are multiple - one for beds, one for baths)
      const buttons = screen.getAllByRole('button', { name: '3+' })
      fireEvent.click(buttons[0]) // First one is beds

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ minBeds: 3 })
      )
    })

    it('shows selected bedroom count with active styling', () => {
      const onChange = vi.fn()
      const filters = { ...defaultFilters, minBeds: 2 }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      // Find the specific 2+ button in bedrooms section
      const bedsSection = screen.getByText('Bedrooms').parentElement!
      const twoPlus = bedsSection.querySelector('button:nth-child(3)')
      expect(twoPlus).toHaveClass('bg-[#0c87f2]')
    })
  })

  describe('bathroom filter', () => {
    it('selects bathroom count when clicked', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      // Get 2+ buttons - second one is baths
      const buttons = screen.getAllByRole('button', { name: '2+' })
      fireEvent.click(buttons[1]) // Second one is baths

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ minBaths: 2 })
      )
    })
  })

  describe('reset', () => {
    it('resets all filters when reset is clicked', () => {
      const onChange = vi.fn()
      const filters: FilterValues = {
        status: ['Active'],
        propertyType: ['SingleFamily'],
        minPrice: 200000,
        maxPrice: 500000,
        minBeds: 3,
        maxBeds: undefined,
        minBaths: 2,
        maxBaths: undefined,
      }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: /reset/i }))

      expect(onChange).toHaveBeenCalledWith({
        status: [],
        propertyType: [],
        minPrice: undefined,
        maxPrice: undefined,
        minBeds: undefined,
        maxBeds: undefined,
        minBaths: undefined,
        maxBaths: undefined,
      })
    })

    it('shows active filter count on reset button', () => {
      const onChange = vi.fn()
      const filters: FilterValues = {
        status: ['Active', 'Pending'],
        propertyType: ['SingleFamily'],
        minPrice: 200000,
        maxPrice: undefined,
        minBeds: 3,
        maxBeds: undefined,
        minBaths: undefined,
        maxBaths: undefined,
      }
      render(<FilterPanel filters={filters} onChange={onChange} />)

      expect(screen.getByText('(5)')).toBeInTheDocument()
    })
  })

  describe('mobile mode', () => {
    it('shows close button and header in mobile mode', () => {
      const onChange = vi.fn()
      const onClose = vi.fn()
      render(
        <FilterPanel
          filters={defaultFilters}
          onChange={onChange}
          onClose={onClose}
          isMobile={true}
        />
      )

      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('shows apply button in mobile mode', () => {
      const onChange = vi.fn()
      const onClose = vi.fn()
      render(
        <FilterPanel
          filters={defaultFilters}
          onChange={onChange}
          onClose={onClose}
          isMobile={true}
        />
      )

      expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      const onChange = vi.fn()
      const onClose = vi.fn()
      render(
        <FilterPanel
          filters={defaultFilters}
          onChange={onChange}
          onClose={onClose}
          isMobile={true}
        />
      )

      // Find the close button (has the X SVG)
      const header = screen.getByText('Filters').parentElement!
      const closeButton = header.querySelector('button')!
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onChange and onClose when apply is clicked', () => {
      const onChange = vi.fn()
      const onClose = vi.fn()
      render(
        <FilterPanel
          filters={defaultFilters}
          onChange={onChange}
          onClose={onClose}
          isMobile={true}
        />
      )

      // Select a filter
      fireEvent.click(screen.getByRole('button', { name: 'For Sale' }))

      // Click apply - onChange should only be called on apply in mobile mode
      fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))

      expect(onChange).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    it('does not call onChange immediately when filter changes in mobile mode', () => {
      const onChange = vi.fn()
      render(
        <FilterPanel
          filters={defaultFilters}
          onChange={onChange}
          isMobile={true}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'For Sale' }))

      // onChange should NOT be called in mobile mode until Apply is clicked
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('desktop mode', () => {
    it('does not show apply button in desktop mode', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      expect(screen.queryByRole('button', { name: 'Apply Filters' })).not.toBeInTheDocument()
    })

    it('calls onChange immediately when filter changes in desktop mode', () => {
      const onChange = vi.fn()
      render(<FilterPanel filters={defaultFilters} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'For Sale' }))

      expect(onChange).toHaveBeenCalled()
    })
  })
})
