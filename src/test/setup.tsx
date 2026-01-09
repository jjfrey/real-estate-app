import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
  }),
  usePathname: () => '/',
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return <a href={href} {...props}>{children}</a>
  },
}))

// Mock mapbox-gl
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      getBounds: vi.fn(() => ({
        getNorth: () => 28,
        getSouth: () => 26,
        getEast: () => -80,
        getWest: () => -82,
      })),
      fitBounds: vi.fn(),
    })),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      getElement: vi.fn(() => document.createElement('div')),
    })),
    NavigationControl: vi.fn(),
    LngLatBounds: vi.fn(() => ({
      extend: vi.fn(),
    })),
    accessToken: '',
  },
}))

// Mock fetch for API tests
global.fetch = vi.fn()

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'test-token')

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
