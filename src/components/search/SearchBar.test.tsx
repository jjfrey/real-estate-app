import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from './SearchBar'
import { mockAutocompleteResults, createFetchResponse } from '@/test/mocks'

describe('SearchBar', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset()
  })

  it('renders with default placeholder', () => {
    render(<SearchBar />)
    expect(screen.getByPlaceholderText('Search by address, city, or ZIP code...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<SearchBar placeholder="Custom placeholder" />)
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  it('renders with default value', () => {
    render(<SearchBar defaultValue="Sarasota" />)
    expect(screen.getByDisplayValue('Sarasota')).toBeInTheDocument()
  })

  it('renders search button by default', () => {
    render(<SearchBar />)
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('hides search button when showButton is false', () => {
    render(<SearchBar showButton={false} />)
    expect(screen.queryByRole('button', { name: /search/i })).not.toBeInTheDocument()
  })

  it('updates input value on change', async () => {
    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Naples')
    expect(input).toHaveValue('Naples')
  })

  it('calls onSearch with query when form is submitted', async () => {
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Tampa')

    const form = input.closest('form')!
    fireEvent.submit(form)

    expect(onSearch).toHaveBeenCalledWith('Tampa')
  })

  describe('autocomplete', () => {
    it('fetches autocomplete results when query is 2+ characters', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(<SearchBar />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sa')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/search/autocomplete?q=Sa')
      })
    })

    it('does not fetch when query is less than 2 characters', async () => {
      render(<SearchBar />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'S')

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled()
      }, { timeout: 500 })
    })

    it('displays autocomplete results', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(<SearchBar />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
        expect(screen.getByText('Sarasota Springs, FL')).toBeInTheDocument()
      })
    })

    it('calls onSearch with selected result', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))
      const onSearch = vi.fn()

      render(<SearchBar onSearch={onSearch} />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Sarasota, FL'))
      expect(onSearch).toHaveBeenCalledWith('SARASOTA', 'city')
    })

    it('closes dropdown when clicking outside', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createFetchResponse(mockAutocompleteResults))

      render(
        <div>
          <SearchBar />
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
      render(<SearchBar />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // First item should be selected (has different styling)
      const firstItem = screen.getByText('Sarasota, FL').closest('button')
      expect(firstItem).toHaveClass('bg-[#0c87f2]/10')
    })

    it('navigates up with ArrowUp', async () => {
      render(<SearchBar />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      // Go down twice then up once
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })

      const firstItem = screen.getByText('Sarasota, FL').closest('button')
      expect(firstItem).toHaveClass('bg-[#0c87f2]/10')
    })

    it('selects item with Enter', async () => {
      const onSearch = vi.fn()
      render(<SearchBar onSearch={onSearch} />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onSearch).toHaveBeenCalledWith('SARASOTA', 'city')
    })

    it('closes dropdown with Escape', async () => {
      render(<SearchBar />)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Sarasota')

      await waitFor(() => {
        expect(screen.getByText('Sarasota, FL')).toBeInTheDocument()
      })

      fireEvent.keyDown(input, { key: 'Escape' })

      expect(screen.queryByText('Sarasota, FL')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows loading spinner while fetching', async () => {
      let resolvePromise: (value: Response) => void
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(global.fetch).mockReturnValue(promise)

      render(<SearchBar />)
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
  })

  it('handles fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Sarasota')

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Autocomplete error:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })
})
