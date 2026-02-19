# Multi-Site Platform PRD

## DistinctHomes + HarmonHomes Architecture

**Last Updated:** 2026-02-19
**Status:** Phase 1 Complete

---

## 1. Vision

Evolve the current single-site DistinctiveHomes platform into a multi-site real estate platform powering two brands from a single codebase:

| | DistinctHomes | HarmonHomes |
|---|---|---|
| **Positioning** | Premier/luxury homes | All homes, all price points |
| **Listings** | Filtered by state-specific price thresholds (e.g., Ohio $500k+) | All listings from all feeds |
| **Data Sources** | Shared feeds | Shared feeds + additional large feed (~300k listings) |
| **Domain** | distincthomes.com | harmonhomes.com |
| **Portal** | Shared admin portal accessible from either domain |

Both sites share: codebase, database, agents, offices, feed sync infrastructure, and admin portal. They differ in: branding, listing visibility rules, and (eventually) data sources.

---

## 2. Current State

### What Exists
- Single Next.js app ("Harmon's Distinctive Homes") deployed on Railway
- Single PostgreSQL database
- kvCORE XML feed (~2,170 Florida listings) synced within the app
- Admin portal with role hierarchy: super_admin → company_admin → office_admin → agent → consumer
- Lead management with office/agent routing
- Company and office management
- Feed sync management via portal (syncFeeds, syncLogs tables)
- NextAuth authentication (Google OAuth + credentials)

### What Needs to Change
1. Site identity and branding must be environment-driven
2. Listing queries must support per-site filtering rules
3. Feed sync must be extracted to a dedicated service
4. Staging database needed for large feed processing
5. Feature flags needed for safe multi-site rollout
6. Schema additions for site attribution (leads, users, saved listings)

---

## 3. Architecture

### 3.1 Railway Services

```
Railway Project: "Real Estate Platform"
├── Service: distincthomes         (Next.js — consumer site + portal)
├── Service: harmonhomes           (Next.js — consumer site + portal)
├── Service: feed-sync             (Node.js worker — cron scheduled)
├── Service: postgres-production   (read-optimized, serves both sites)
└── Service: postgres-staging      (write-optimized, feed ingestion)
```

All services deploy from the same GitHub repository. Site identity is controlled by `NEXT_PUBLIC_SITE_ID` environment variable per service.

### 3.2 Data Flow

```
Feed Sources                    Staging DB              Production DB
┌──────────┐                ┌────────────────┐      ┌────────────────┐
│ kvCORE   │──→             │ staging_*      │      │ listings       │
│ (2.1k)   │   ┌────────┐  │ tables         │      │ agents         │
└──────────┘──→│  Sync  │─→│                │─────→│ offices        │
┌──────────┐──→│ Worker │  │ Raw feed data  │delta │ photos         │
│ New Feed │──→│        │  │ + checksums    │only  │ open_houses    │
│ (300k)   │   └────────┘  │ + conflict log │      │                │
└──────────┘                └────────────────┘      └────────────────┘
                                                      ▲          ▲
                                                      │          │
                                                distincthomes  harmonhomes
```

### 3.3 Site Configuration

Each site is defined by a configuration that controls branding and listing visibility:

```typescript
// src/lib/site-config.ts — actual implementation
interface SiteConfig {
  id: string              // "distinct" or "harmon"
  name: string            // Full brand name
  shortName: string       // Short display name
  tagline: string
  domain: string
  logoPath: string        // /logos/distinct-logo.png or /logos/harmon-logo.png
  logoAlt: string
  colors: {               // Full palette: primary50 through primary900, accent500, accent600
    primary50: string; primary100: string; primary200: string; primary300: string;
    primary400: string; primary500: string; primary600: string; primary700: string;
    primary800: string; primary900: string; accent500: string; accent600: string;
  }
  fonts: { heading: string; body: string }
  og: { siteName: string; description: string; image: string }
  legal: { companyName: string; companyEmail: string; copyrightName: string }
  email: { fromName: string; fromAddress: string; gradientStart: string; gradientEnd: string; buttonColor: string }
  portal: { title: string }
  hero: { title: string; subtitle: string; overlayColor: string; accentColor: string }
}
```

Listing filter rules are stored in the database (`site_listing_rules` table) and manageable via the admin portal:

```typescript
// Example rules (seeded by scripts/seed-sites.ts)
// DistinctHomes: state-specific price floors
{ siteId: 'distinct', state: 'OH', minPrice: 500000 }
{ siteId: 'distinct', state: 'FL', minPrice: 750000 }
{ siteId: 'distinct', state: null, minPrice: 400000 }  // default (null state = all states)

// HarmonHomes: no restrictions (show everything)
// (no rules = no filtering)
```

### 3.4 Shared vs. Site-Scoped Data

| Data | Scope | Notes |
|------|-------|-------|
| Listings | Shared | Same rows, filtered at query time per site rules |
| Agents | Shared | Agent appears on whichever site shows their listings |
| Offices | Shared | Same as agents |
| Companies | Shared | Organizational structure is site-independent |
| Portal Users (admin roles) | Shared | Single login, see all data |
| Consumer Users | Per-site | Separate accounts per brand |
| Leads | Attributed | `siteId` tracks which site generated the lead |
| Saved Listings | Per-site | Scoped to consumer's site |
| Feature Flags | Per-site or global | Configurable scope |

---

## 4. Schema Changes

### 4.1 New Tables

#### `sites` (implemented)
```
id           varchar(50) PK  -- 'distinct', 'harmon'
name         varchar(255)    -- 'Harmon's Distinctive Homes'
domain       varchar(255)    -- 'https://distincthomes.com'
brandConfig  text            -- JSON string (branding stored in site-config.ts, not here)
isActive     boolean default true
createdAt    timestamptz
updatedAt    timestamptz
```

#### `site_listing_rules` (implemented)
```
id           serial PK
siteId       varchar(50) FK → sites  -- 'distinct' or 'harmon'
state        varchar(2)      -- 'OH', 'FL', or null for default/all states
minPrice     decimal(12,2)
maxPrice     decimal(12,2) nullable
propertyTypes text           -- JSON array string (nullable = all types)
statuses     text            -- JSON array string (nullable = all statuses)
isActive     boolean default true
createdAt    timestamptz
updatedAt    timestamptz
```

#### `feature_flags` (implemented)
```
id                serial PK
key               varchar(100) unique  -- 'enable_saved_listings', 'new_search_ui'
description       text
enabledGlobal     boolean default false
enabledSites      text                 -- JSON array string: '["distinct"]' or null
rolloutPercentage integer default 100  -- 0-100
metadata          text                 -- JSON string
createdAt         timestamptz
updatedAt         timestamptz
```

#### Staging Tables (in staging database)

```
staging_listings
  id, feedId, mlsId, rawData (jsonb), checksum, syncedAt, promotedAt, conflictFlag

staging_photos
  id, stagingListingId, url, sortOrder, caption, syncedAt

staging_agents
  id, feedId, email, rawData (jsonb), checksum, syncedAt, promotedAt

staging_offices
  id, feedId, name, rawData (jsonb), checksum, syncedAt, promotedAt

staging_conflicts
  id, mlsId, feedId1, feedId2, field, value1, value2, resolvedAt, resolution
```

### 4.2 Modified Tables

#### `leads` — site attribution (implemented)
```
+ siteId    varchar(50) FK → sites  -- 'distinct' or 'harmon'
```

#### `users` — site scope for consumers (implemented)
```
+ siteId    varchar(50) FK → sites  -- null for admin/agent roles, set for consumers
```

#### `saved_listings` — site scope (implemented)
```
+ siteId    varchar(50) FK → sites
```

#### `sync_feeds` — feed priority (implemented)
```
+ priority  integer default 0  -- higher = wins conflicts
```

---

## 5. Sync Worker Architecture

### 5.1 Feed Adapter Pattern

Each data source gets an adapter that normalizes its data into a common staging format:

```typescript
interface FeedAdapter {
  id: string
  parse(source: ReadableStream): AsyncGenerator<StagingRecord>
  // Streaming — never loads full feed into memory
}

// Implementations
class KvCoreFeedAdapter implements FeedAdapter { ... }
class NewFeedAdapter implements FeedAdapter { ... }
```

### 5.2 Sync Pipeline

1. **Fetch** — Download feed (streaming for large feeds)
2. **Parse** — Adapter converts to common format, yields batches of 500-1,000
3. **Stage** — Batch upsert into staging tables with checksums
4. **Promote** — Compare staging checksums vs. production, push deltas only
5. **Clean** — Mark stale staging records, log conflicts
6. **Report** — Update sync_logs with stats

### 5.3 Promotion Logic

```
For each staging record where checksum != production checksum:
  1. Validate data (required fields, ranges)
  2. Check for cross-feed conflicts on same mlsId
  3. Apply conflict resolution (feed priority wins)
  4. Upsert to production
  5. Mark staging record as promoted

For listings in production not in any staging feed:
  1. Mark as inactive (don't delete — preserve for lead history)
  2. Log removal for admin review
```

### 5.4 Scheduling

| Feed | Size | Schedule | Expected Duration |
|------|------|----------|-------------------|
| kvCORE | ~2,200 | Every 6 hours | ~2 minutes |
| New Feed | ~300,000 | Daily (off-peak) | ~30-60 minutes |
| Promotion | — | After each sync completes | ~5 minutes |

### 5.5 Portal Integration

The portal triggers manual syncs by inserting into a `sync_requests` table. The sync worker polls this table on a short interval (30s). No HTTP endpoint needed on the worker.

---

## 6. Feature Flags

### 6.1 Implementation

Database-backed flags with in-memory caching (60-second TTL):

```typescript
// src/lib/feature-flags.ts
async function isEnabled(key: string, siteId?: string): Promise<boolean>
async function getFlag(key: string): Promise<FeatureFlag | null>
```

### 6.2 Admin Portal

Super admins can manage flags via the portal:
- Create/edit/delete flags
- Toggle per-site enablement
- Set rollout percentages
- View flag usage (which code paths reference which flags)

### 6.3 Planned Flags

| Flag Key | Purpose | Initial State |
|----------|---------|---------------|
| `consumer_accounts` | Enable consumer registration/login | distincthomes: on, harmonhomes: off |
| `saved_listings` | Enable save/favorite functionality | distincthomes: on, harmonhomes: off |
| `lead_capture` | Enable info request / tour request forms | both: on |
| `virtual_tour_badge` | Show virtual tour indicators | both: on |
| `map_search` | Enable map-based search | both: on |
| `maintenance_mode` | Show maintenance page | both: off |

---

## 7. Implementation Phases

### Phase 1: Multi-Site Foundation ✓ COMPLETE
**Goal:** Site identity, branding abstraction, schema groundwork

- [x] Create `sites` table and `site_listing_rules` table
- [x] Create `feature_flags` table with basic read/cache layer (`src/lib/feature-flags.ts`)
- [x] Build site config module (`src/lib/site-config.ts`)
- [x] Add `NEXT_PUBLIC_SITE_ID` environment variable support (`"distinct"` / `"harmon"`)
- [x] CSS variables bridge — `@theme inline` block with brand utilities (`text-brand`, `bg-brand`, etc.)
- [x] Abstract layout/branding — logo, name, colors, fonts, OG metadata driven by site config (~25 files updated)
- [x] Add `siteId` to leads, users (consumer), saved_listings tables
- [x] Update lead creation API to capture siteId
- [x] Update consumer registration to capture siteId
- [x] Build feature flag read layer with 60s in-memory caching
- [x] Site-scoped listing queries (getListings, searchAutocomplete, getCitiesWithCounts)
- [x] Admin portal: feature flags management page (`/portal/admin/feature-flags`)
- [x] Sync cron guard (`ENABLE_CRON_SYNC` env var)
- [x] PostHog site_id attribution on all events
- [x] Seed script for sites and listing rules (`scripts/seed-sites.ts`)
- [ ] Admin portal: site listing rules management page (deferred — rules seeded via script)

**Deliverable:** DistinctHomes continues working as-is, but branding is now config-driven. HarmonHomes can be deployed by setting `NEXT_PUBLIC_SITE_ID=harmon`.

---

### Phase 2: Sync Service Extraction
**Goal:** Standalone sync worker, staging tables, promotion pipeline

- [ ] Create feed adapter interface and kvCORE adapter
- [ ] Create staging tables (same database initially — split later)
- [ ] Build sync worker as standalone Node.js service (no Next.js)
- [ ] Implement batch upserts with checksums for delta detection
- [ ] Build promotion logic (staging → production, deltas only)
- [ ] Add `sync_requests` table for portal-triggered syncs
- [ ] Update portal sync admin to use sync_requests queue
- [ ] Remove sync endpoints from Next.js app
- [ ] Railway: deploy sync worker as separate service
- [ ] Verify sync works end-to-end: feed → staging → promotion → live data

**Deliverable:** Sync runs independently. Next.js app no longer handles any sync logic. Portal can still trigger and monitor syncs.

---

### Phase 3: HarmonHomes Launch
**Goal:** Second site live with existing kvCORE feed

- [ ] HarmonHomes brand config (name, logo, colors, fonts, domain)
- [ ] DistinctHomes listing filter rules (state-specific price thresholds)
- [ ] Verify listing queries apply site-specific filters correctly
- [ ] Update sitemaps and robots.txt per site
- [ ] Update SEO metadata (OG images, descriptions) per site
- [ ] Verify shared portal works from both domains
- [ ] Verify leads are attributed to correct site
- [ ] Railway: deploy second service with NEXT_PUBLIC_SITE_ID=harmonhomes
- [ ] DNS + SSL setup for harmonhomes.com
- [ ] Smoke test both sites end-to-end

**Deliverable:** Both sites live. DistinctHomes shows premier listings only. HarmonHomes shows all listings. Same data, different filters, different branding.

---

### Phase 4: Staging Database Split + Large Feed
**Goal:** Separate staging DB, 300k listing feed integrated

- [ ] Provision second Postgres instance on Railway (staging)
- [ ] Migrate staging tables from production DB to staging DB
- [ ] Update sync worker to connect to both databases
- [ ] Build new feed adapter for 300k listing source
- [ ] Implement streaming parser (sax/xml-stream) for large feeds
- [ ] Implement cross-feed deduplication (same MLS ID from multiple sources)
- [ ] Build conflict detection and resolution (feed priority)
- [ ] Admin portal: conflict review dashboard
- [ ] Batch promotion with progress tracking
- [ ] Monitor production DB performance under 300k+ listing load
- [ ] Optimize indexes if needed for larger dataset
- [ ] Load test search/filter queries at scale

**Deliverable:** 300k+ listings live on HarmonHomes. Feed sync is isolated from production. Conflicts between feeds are detected and resolved.

---

### Phase 5: Operational Maturity
**Goal:** Production-ready multi-site platform

- [ ] PostHog feature flags for user-facing A/B experiments
- [ ] Monitoring and alerting for sync failures
- [ ] Per-site analytics dashboards in portal
- [ ] Sync health dashboard (feed status, last run, error rate)
- [ ] Automated conflict resolution rules (reduce manual review)
- [ ] Database connection pooling review for 300k listing scale
- [ ] CDN/caching strategy for listing photos at scale
- [ ] Rate limiting per-site for API endpoints
- [ ] Consumer account migration tooling (if needed between sites)
- [ ] Documentation: runbooks for common operations

**Deliverable:** Platform is stable, observable, and operationally mature for ongoing growth.

---

## 8. Environment Variables (Per Service)

### Both Sites (shared)
```
DATABASE_URL=<production postgres internal URL>
NEXTAUTH_SECRET=<shared secret>
GOOGLE_CLIENT_ID=<shared OAuth>
GOOGLE_CLIENT_SECRET=<shared OAuth>
RESEND_API_KEY=<shared email>
NEXT_PUBLIC_MAPBOX_TOKEN=<shared token>
```

### DistinctHomes
```
NEXT_PUBLIC_SITE_ID=distinct
NEXT_PUBLIC_APP_URL=https://distincthomes.com
NEXTAUTH_URL=https://distincthomes.com
ENABLE_CRON_SYNC=false            # HarmonHomes deployment handles cron
```

### HarmonHomes
```
NEXT_PUBLIC_SITE_ID=harmon
NEXT_PUBLIC_APP_URL=https://harmonhomes.com
NEXTAUTH_URL=https://harmonhomes.com
ENABLE_CRON_SYNC=true             # Only this deployment runs the cron
```

### Sync Worker
```
DATABASE_URL=<production postgres>
STAGING_DATABASE_URL=<staging postgres>
KVCORE_FEED_URL=<kvCORE feed URL>
NEW_FEED_URL=<new feed URL>
CRON_SECRET=<for Railway cron>
```

---

## 9. Open Questions

1. **HarmonHomes branding** — Do we have logo, colors, fonts ready, or does this need design work first?
2. **New feed format** — Is the 300k listing feed XML, JSON, or API-based? What fields does it provide?
3. **New feed overlap** — Does the new feed cover the same Florida markets as kvCORE, or different geographies? How much MLS ID overlap?
4. **DistinctHomes price thresholds** — Do we have the state-by-state price rules defined, or is this TBD?
5. **Consumer accounts on HarmonHomes** — Launch with or without consumer features (saved listings, etc.)?
6. **Portal domain** — Keep portal on both site domains, or move to a neutral domain (e.g., portal.harmonhomes.com)?
7. **Google OAuth** — Do we need separate OAuth credentials per domain, or can one credential handle both redirect URIs?
8. **New feed contract/access** — Is the new feed already available for development, or pending?

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 300k listing sync degrades production DB | Both sites slow/down during sync | Staging DB isolation, delta-only promotion |
| Cross-feed data conflicts (price disagreements) | Wrong data shown to consumers | Conflict detection + feed priority + admin review |
| Shared codebase bug takes down both sites | Both brands offline | Feature flags, Railway instant rollback, test coverage |
| Consumer confusion between brands | Brand dilution | Separate consumer accounts, distinct branding, no cross-linking |
| Feed source outage | Stale listings | Graceful degradation — keep existing data, alert on failed sync |
| Railway cost scaling with 300k listings | Budget overrun | Monitor usage, optimize queries, consider read replicas if needed |
