import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('site-config', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_ID

  afterEach(() => {
    vi.resetModules()
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_SITE_ID = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_SITE_ID
    }
  })

  describe('getSiteId', () => {
    it('returns "distinct" by default when env var is not set', async () => {
      delete process.env.NEXT_PUBLIC_SITE_ID
      const { getSiteId } = await import('./site-config')
      expect(getSiteId()).toBe('distinct')
    })

    it('returns the value of NEXT_PUBLIC_SITE_ID when set', async () => {
      process.env.NEXT_PUBLIC_SITE_ID = 'harmon'
      const { getSiteId } = await import('./site-config')
      expect(getSiteId()).toBe('harmon')
    })
  })

  describe('siteConfig', () => {
    it('returns distinct config by default', async () => {
      delete process.env.NEXT_PUBLIC_SITE_ID
      const { siteConfig } = await import('./site-config')
      expect(siteConfig.id).toBe('distinct')
      expect(siteConfig.name).toBe("Harmon's Distinctive Homes")
      expect(siteConfig.shortName).toBe('DistinctHomes')
      expect(siteConfig.domain).toBe('distincthomes.com')
      expect(siteConfig.logoPath).toBe('/logos/distinct-logo.png')
    })

    it('returns harmon config when NEXT_PUBLIC_SITE_ID is harmon', async () => {
      process.env.NEXT_PUBLIC_SITE_ID = 'harmon'
      const { siteConfig } = await import('./site-config')
      expect(siteConfig.id).toBe('harmon')
      expect(siteConfig.name).toBe('HarmonHomes')
      expect(siteConfig.shortName).toBe('HarmonHomes')
      expect(siteConfig.domain).toBe('harmonhomes.com')
      expect(siteConfig.logoPath).toBe('/logos/harmon-logo.png')
    })

    it('falls back to distinct config for unknown site ID', async () => {
      process.env.NEXT_PUBLIC_SITE_ID = 'unknown'
      const { siteConfig } = await import('./site-config')
      expect(siteConfig.id).toBe('distinct')
    })
  })

  describe('getSiteConfig', () => {
    it('returns config for a specific site ID', async () => {
      delete process.env.NEXT_PUBLIC_SITE_ID
      const { getSiteConfig } = await import('./site-config')
      const harmonConfig = getSiteConfig('harmon')
      expect(harmonConfig.id).toBe('harmon')
      expect(harmonConfig.name).toBe('HarmonHomes')
    })

    it('falls back to distinct for unknown site ID', async () => {
      const { getSiteConfig } = await import('./site-config')
      const config = getSiteConfig('nonexistent')
      expect(config.id).toBe('distinct')
    })

    it('uses env var when no argument provided', async () => {
      process.env.NEXT_PUBLIC_SITE_ID = 'harmon'
      const { getSiteConfig } = await import('./site-config')
      const config = getSiteConfig()
      expect(config.id).toBe('harmon')
    })
  })

  describe('SiteConfig structure', () => {
    it('distinct config has all required fields', async () => {
      const { getSiteConfig } = await import('./site-config')
      const config = getSiteConfig('distinct')

      expect(config.colors).toBeDefined()
      expect(config.colors.primary500).toBe('#0c87f2')
      expect(config.fonts).toBeDefined()
      expect(config.og).toBeDefined()
      expect(config.legal).toBeDefined()
      expect(config.legal.companyName).toBe('Harmon Worldwide, LLC')
      expect(config.email).toBeDefined()
      expect(config.portal).toBeDefined()
      expect(config.hero).toBeDefined()
      expect(config.hero.titleAccent).toBe('Luxury Home')
    })

    it('harmon config has all required fields', async () => {
      const { getSiteConfig } = await import('./site-config')
      const config = getSiteConfig('harmon')

      expect(config.colors).toBeDefined()
      expect(config.colors.primary500).toBe('#22c55e')
      expect(config.fonts).toBeDefined()
      expect(config.og).toBeDefined()
      expect(config.legal).toBeDefined()
      expect(config.email).toBeDefined()
      expect(config.portal).toBeDefined()
      expect(config.portal.title).toBe('HarmonHomes Agent Portal')
      expect(config.hero).toBeDefined()
      expect(config.hero.titleAccent).toBe('Dream Home')
    })

    it('distinct and harmon have different branding', async () => {
      const { getSiteConfig } = await import('./site-config')
      const distinct = getSiteConfig('distinct')
      const harmon = getSiteConfig('harmon')

      expect(distinct.colors.primary500).not.toBe(harmon.colors.primary500)
      expect(distinct.logoPath).not.toBe(harmon.logoPath)
      expect(distinct.domain).not.toBe(harmon.domain)
      expect(distinct.og.siteName).not.toBe(harmon.og.siteName)
    })
  })
})
