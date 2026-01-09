import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeroSearch } from './HeroSearch'
import { mockAutocompleteResults, createFetchResponse } from '@/test/mocks'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

describe('HeroSearch', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset()
    mockPush.mockReset()
  })

  describe('rendering', () => {
    it('renders buy and rent tabs', () => {
      render(<HeroSearch />)
      expect(screen.getByRole('button', { name: 'Buy' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Rent' })).toBeInTheDocument()
    })

    it('renders search input with placeholder', () => {
      render(<HeroSearch />)
      expect(screen.getByPlaceholderText('Search by address, city, or ZIP code...')).toBeInTheDocument()
    })

    it('renders search button', () => {
      render(<HeroSearch />)
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('renders quick filter buttons', () => {
      render(<HeroSearch />)
      expect(screen.getByRole('button', { name: 'Any Price' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Beds' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Home Type' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument()
    })

    it('renders map search link', () => {
      render(<HeroSearch />)
      expect(screen.getByRole('link', { name: /explore with map search/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /explore with map search/i })).toHaveAttribute('href', '/search')
    })

    it('has buy tab active by default', () => {
      render(<HeroSearch />)
      const buyButton = screen.getByRole('button', { name: 'Buy' })
      expect(buyButton).toHaveClass('bg-[#0c87f2]')
    })
  })

  describe('tab switching', () => {
    it('switches to rent tab when clicked', () => {
      render(<HeroSearch />)
      const rentButton = screen.getByRole('button', { name: 'Rent' })

      fireEvent.click(rentButton)

      expect(rentButton).toHaveClass('bg-[#0c87f2]')
      expect(screen.getByRole('button', { name: 'Buy' })).not.toHaveClass('bg-[#0c87f2]')
    })

    it('switches back to buy tab when clicked', () => {
      render(<HeroSearch />)
      const rentButton = screen.getByRole('button', { name: 'Rent' })
      const buyButton = screen.getByRole('button', { name: 'Buy' })

      fireEvent.click(rentButton)
      fireEvent.click(buyButton)

      expect(buyButton).toHaveClass('bg-[#0c87f2]')
      expect(rentButton).not.toHaveClass('bg-[#0c87f2]')
    })
  })

  describe('form submission', () => {
    it('navigates to search with query param on submit', async () => {
      render(<HeroSearch />)
      const input = screen.getByRole('textbox')

      await userEvent.type(input, 'Tampa')
      const form = input.closest('form')!
      fireEvent.submit(form)

      expect(mockPush).toHaveBeenCalledWith('/search?q=Tampa&status=Active')
    })

    it('includes rent status when rent tab is active', async () => {
      render(<HeroSearch />)

      fireEvent.click(screen.getByRole('button', { name: 'Rent' }))

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Miami')
      const form = input.closest('form')!
      fireEvent.submit(form)

      expect(mockPush).toHaveBeenCalledWith('/search?q=Miami&status=For+Rent')
    })

    it('navigates to search without query if input is empty', async () => {
      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      const form = input.closest('form')!

      fireEvent.submit(form)

      expect(mockPush).toHaveBeenCalledWith('/search?status=Active')
    })
  })

  describe('autocomplete', () => {
    it('fetches results when query is 2+ characters', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sa')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/search/autocomplete?q=Sa')
      })
    })

    it('does not fetch when query is less than 2 characters', async () => {
      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'S')

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled()
      }, { timeout: 500 })
    })

    it('displays autocomplete results', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
        expect(screen.getByText('Sarasota Springs, FL')).toBeInTheDocument()
      })
    })

    it('shows loading spinner while fetching', async () => {
      let resolvePromise: (value: Response) => void
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(global.fetch).mockReturnValue(promise)

      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sa')

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).toBeInTheDocument()
      })

      resolvePromise!(createFetchResponse(mockAutocompleteResults))

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })

    it('navigates to search with city filter when city is selected', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Sarasota, FL'))

      expect(mockPush).toHaveBeenCalledWith('/search?city=SARASOTA&status=Active')
    })

    it('navigates with rent status when rent tab is active and city selected', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(<HeroSearch />)
      fireEvent.click(screen.getByRole('button', { name: 'Rent' }))

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Sarasota, FL'))

      expect(mockPush).toHaveBeenCalledWith('/search?city=SARASOTA&status=For+Rent')
    })

    it('navigates with zip filter when zip is selected', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, '34236')

      await waitFor(() => {
        expect(screen.getByText('34236 - Sarasota, FL')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('34236 - Sarasota, FL'))

      expect(mockPush).toHaveBeenCalledWith('/search?zip=34236&status=Active')
    })

    it('closes dropdown when clicking outside', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(
        <div>
          <HeroSearch />
          <div data-testid="outside">Outside</div>
        </div>
      )

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      fireEvent.mouseDown(screen.getByTestId('outside'))

      await waitFor(() => {
        expect(screen.queryByText('Sarasota, FL')).not.toBeInTheDocument()
      })
    })
  })

  describe('keyboard navigation', () => {
    beforeEach(() => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))
    })

    it('navigates down with ArrowDown', async () => {
      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      fireEvent.keyDown(input, { key: 'ArrowDown' })

      const firstItem = screen.getByText('Sarasota, FL').closest('button')
      expect(firstItem).toHaveClass('bg-[#0c87f2]/10')
    })

    it('navigates up with ArrowUp', async () => {
      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })

      const firstItem = screen.getByText('Sarasota, FL').closest('button')
      expect(firstItem).toHaveClass('bg-[#0c87f2]/10')
    })

    it('selects item with Enter', async () => {
      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockPush).toHaveBeenCalledWith('/search?city=SARASOTA&status=Active')
    })

    it('closes dropdown with Escape', async () => {
      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      fireEvent.keyDown(input, { key: 'Escape' })

      expect(screen.queryByText('Sarasota, FL')).not.toBeInTheDocument()
    })
  })

  describe('address result handling', () => {
    it('navigates directly to listing when address is selected', async () => {
      const addressResult = [{
        id: 123,
        type: 'address',
        label: '123 Main St, Sarasota, FL 34236',
        value: '123 Main St',
        city: 'SARASOTA',
        state: 'FL',
      }]
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(addressResult))

      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, '123 Main')

      await waitFor(() => {
        expect(screen.getByText('123 Main St, Sarasota, FL 34236')).toBeInTheDocument()
      }, { timeout: 3000 })

      await userEvent.click(screen.getByText('123 Main St, Sarasota, FL 34236'))

      expect(mockPush).toHaveBeenCalledWith('/listings/123')
    })
  })

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      render(<HeroSearch />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Autocomplete error:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })
})
