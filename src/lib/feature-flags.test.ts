import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(),
    })),
  },
}))

import { db } from '@/db'

// Helper to set up the DB mock chain
function mockDbSelect(data: unknown[]) {
  const fromFn = vi.fn().mockResolvedValue(data)
  vi.mocked(db.select).mockReturnValue({ from: fromFn } as never)
}

describe('feature-flags', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Clear cache before each test by re-importing
    const { clearFlagsCache } = await import('./feature-flags')
    clearFlagsCache()
  })

  describe('isFeatureEnabled', () => {
    it('returns false for unknown flag key', async () => {
      mockDbSelect([])
      const { isFeatureEnabled } = await import('./feature-flags')
      const result = await isFeatureEnabled('nonexistent')
      expect(result).toBe(false)
    })

    it('returns true when flag is globally enabled', async () => {
      mockDbSelect([
        { id: 1, key: 'test_flag', enabledGlobal: true, enabledSites: null, rolloutPercentage: 100 },
      ])
      const { isFeatureEnabled, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      const result = await isFeatureEnabled('test_flag')
      expect(result).toBe(true)
    })

    it('returns false when flag is globally disabled and no site match', async () => {
      mockDbSelect([
        { id: 1, key: 'test_flag', enabledGlobal: false, enabledSites: null, rolloutPercentage: 100 },
      ])
      const { isFeatureEnabled, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      const result = await isFeatureEnabled('test_flag')
      expect(result).toBe(false)
    })

    it('returns true when flag is enabled for the given site', async () => {
      mockDbSelect([
        { id: 1, key: 'test_flag', enabledGlobal: false, enabledSites: '["distinct"]', rolloutPercentage: 100 },
      ])
      const { isFeatureEnabled, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      const result = await isFeatureEnabled('test_flag', 'distinct')
      expect(result).toBe(true)
    })

    it('returns false when flag is enabled for a different site', async () => {
      mockDbSelect([
        { id: 1, key: 'test_flag', enabledGlobal: false, enabledSites: '["distinct"]', rolloutPercentage: 100 },
      ])
      const { isFeatureEnabled, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      const result = await isFeatureEnabled('test_flag', 'harmon')
      expect(result).toBe(false)
    })

    it('handles invalid JSON in enabledSites gracefully', async () => {
      mockDbSelect([
        { id: 1, key: 'test_flag', enabledGlobal: false, enabledSites: 'invalid-json', rolloutPercentage: 100 },
      ])
      const { isFeatureEnabled, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      const result = await isFeatureEnabled('test_flag', 'distinct')
      expect(result).toBe(false)
    })

    it('returns true when flag is enabled for multiple sites', async () => {
      mockDbSelect([
        { id: 1, key: 'test_flag', enabledGlobal: false, enabledSites: '["distinct","harmon"]', rolloutPercentage: 100 },
      ])
      const { isFeatureEnabled, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      expect(await isFeatureEnabled('test_flag', 'distinct')).toBe(true)

      // Need to clear and re-mock for second call since cache is populated
      expect(await isFeatureEnabled('test_flag', 'harmon')).toBe(true)
    })
  })

  describe('getFeatureFlag', () => {
    it('returns the flag when found', async () => {
      const flagData = { id: 1, key: 'my_flag', description: 'Test flag', enabledGlobal: true, enabledSites: null, rolloutPercentage: 100, metadata: null, createdAt: new Date(), updatedAt: new Date() }
      mockDbSelect([flagData])
      const { getFeatureFlag, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      const result = await getFeatureFlag('my_flag')
      expect(result).toEqual(flagData)
    })

    it('returns undefined when flag not found', async () => {
      mockDbSelect([])
      const { getFeatureFlag, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      const result = await getFeatureFlag('nonexistent')
      expect(result).toBeUndefined()
    })
  })

  describe('listFeatureFlags', () => {
    it('returns all flags', async () => {
      const flags = [
        { id: 1, key: 'flag_a', enabledGlobal: true },
        { id: 2, key: 'flag_b', enabledGlobal: false },
      ]
      mockDbSelect(flags)
      const { listFeatureFlags, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()
      const result = await listFeatureFlags()
      expect(result).toEqual(flags)
    })
  })

  describe('caching', () => {
    it('uses cached data on subsequent calls', async () => {
      const flags = [{ id: 1, key: 'cached_flag', enabledGlobal: true }]
      mockDbSelect(flags)
      const { isFeatureEnabled, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()

      await isFeatureEnabled('cached_flag')
      await isFeatureEnabled('cached_flag')

      // DB should only have been called once
      expect(db.select).toHaveBeenCalledTimes(1)
    })

    it('clears cache when clearFlagsCache is called', async () => {
      const flags = [{ id: 1, key: 'cached_flag', enabledGlobal: true }]
      mockDbSelect(flags)
      const { isFeatureEnabled, clearFlagsCache } = await import('./feature-flags')
      clearFlagsCache()

      await isFeatureEnabled('cached_flag')
      expect(db.select).toHaveBeenCalledTimes(1)

      clearFlagsCache()
      mockDbSelect(flags) // re-mock for next call
      await isFeatureEnabled('cached_flag')
      expect(db.select).toHaveBeenCalledTimes(2)
    })
  })
})
