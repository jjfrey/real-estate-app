# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Multi-site real estate platform** powering two brands from a single codebase:
- **DistinctHomes** — Premier/luxury listings filtered by state-specific price thresholds
- **HarmonHomes** — All listings, all price points

Both sites share the same codebase, database, and feed infrastructure. Site identity is controlled by the `NEXT_PUBLIC_SITE_ID` env var (`"distinct"` or `"harmon"`). Deployed as two Railway services from one repo.

Powered by BoldTrail/kvCORE XML data feed with ~2,170 listings.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Lint code
npm run lint
```

### Database Commands

```bash
# Push schema to database (creates/updates tables)
npm run db:push

# Generate migration files for schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio

# Sync listings from MLS feed
npm run db:sync

# Seed sites + listing rules (run after migration)
npm run db:seed-sites
```

## Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 with CSS custom property theming
- **Database:** PostgreSQL with Drizzle ORM
- **Maps:** Mapbox GL JS
- **Analytics:** PostHog (with site_id attribution)
- **Data Source:** kvCORE XML feed (daily sync)

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── listings/route.ts         # GET listings with filtering (site-scoped)
│   │   ├── listings/[id]/route.ts    # GET single listing
│   │   ├── search/autocomplete/      # Search suggestions (site-scoped)
│   │   ├── cities/route.ts           # City list with counts (site-scoped)
│   │   ├── cron/sync/route.ts        # Scheduled feed sync (ENABLE_CRON_SYNC guard)
│   │   └── portal/feature-flags/     # Feature flags CRUD (super_admin only)
│   ├── portal/(dashboard)/admin/
│   │   └── feature-flags/page.tsx    # Feature flags management UI
│   ├── listings/[...slug]/page.tsx   # Listing detail page
│   ├── search/page.tsx               # Search results with map
│   └── page.tsx                      # Home page
├── components/
│   ├── home/HeroSearch.tsx           # Hero search bar
│   ├── search/
│   │   ├── SearchBar.tsx             # Autocomplete search
│   │   └── FilterPanel.tsx           # Filter sidebar
│   ├── listing/ListingCard.tsx       # Property card
│   └── map/ListingMap.tsx            # Mapbox integration
├── db/
│   ├── schema.ts                     # Drizzle schema definitions
│   └── index.ts                      # Database connection
├── lib/
│   ├── queries.ts                    # Database query builders (site-scoped filtering)
│   ├── site-config.ts                # Multi-site branding config
│   └── feature-flags.ts              # Feature flag read layer with caching
└── types/
    └── listing.ts                    # TypeScript interfaces

scripts/
├── sync-feed.ts                      # MLS XML feed importer
└── seed-sites.ts                     # Seeds sites + listing rules
```

### Database Schema

Core tables:
- **listings** - Properties (address, price, beds/baths, coordinates, status)
- **listing_photos** - Images per listing (cascade delete)
- **agents** - Real estate agents
- **offices** - Brokerage offices
- **open_houses** - Scheduled showing events

Multi-site tables:
- **sites** - Site definitions (varchar PK: `"distinct"`, `"harmon"`)
- **site_listing_rules** - Per-site listing visibility rules (state-specific price thresholds)
- **feature_flags** - Feature flags with global/per-site toggles

Site-scoped columns (nullable `siteId` FK → sites):
- **leads.siteId** - Tracks which site generated the lead
- **users.siteId** - Scopes consumer accounts to a site (null for portal roles)
- **saved_listings.siteId** - Scopes favorites to a site

Key indexes for performance: geographic (lat/lng), city, status, price, property_type, beds_baths.

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/listings` | Filtered listings with pagination, site-scoped |
| `GET /api/listings/[id]` | Full listing with photos, agent, office, open houses |
| `GET /api/search/autocomplete` | Address/city/ZIP suggestions, site-scoped |
| `GET /api/cities` | Cities with listing counts, site-scoped |
| `GET /api/cron/sync` | Scheduled feed sync (requires CRON_SECRET, ENABLE_CRON_SYNC) |
| `GET/POST/PATCH/DELETE /api/portal/feature-flags` | Feature flags CRUD (super_admin only) |

### Data Flow
1. User search → API route parses filters → Drizzle builds query
2. Database query with indexes → Photo lookup → Paginated response
3. Feed sync: XML → Parse → Upsert listings by mls_id

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/distincthomes

# Multi-site identity (required: "distinct" or "harmon")
NEXT_PUBLIC_SITE_ID=distinct

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feed sync
KVCORE_FEED_URL=https://api.kvcore.com/export/listings/YOUR_KEY/4
ENABLE_CRON_SYNC=true          # Only one deployment should run the cron
CRON_SECRET=your_cron_secret   # Required for /api/cron/sync

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Multi-Site Architecture

### How It Works
1. `NEXT_PUBLIC_SITE_ID` env var determines site identity at build/runtime
2. `src/lib/site-config.ts` exports static branding config (colors, logos, text, legal info) — no DB read needed
3. CSS custom properties are set on `<html>` in `layout.tsx`, bridging site config to Tailwind via `@theme inline` block
4. Tailwind utilities (`text-brand`, `bg-brand`, `hover:bg-brand-hover`, etc.) resolve to site-specific colors
5. Listing queries in `queries.ts` apply `site_listing_rules` from the DB (with 60s in-memory cache)
6. Feature flags in `feature-flags.ts` support global and per-site toggles (60s cache)

### Branding Variables
All components use semantic Tailwind classes instead of hardcoded hex values:
- `brand` / `brand-hover` — primary button/link colors
- `brand-dark` — dark backgrounds (hero gradients)
- `brand-light` — light accents
- `brand-50` / `brand-bg` — subtle backgrounds
- `accent` / `accent-hover` — accent colors

### Site Listing Rules
- DistinctHomes: state-specific price floors (e.g., OH: $500k+, FL: $750k+, default: $400k+)
- HarmonHomes: no rules = shows all listings
- Rules are stored in `site_listing_rules` table, applied at query time in `getListings()`, `searchAutocomplete()`, `getCitiesWithCounts()`

## Key Implementation Notes

### Search & Filtering Capabilities
- Text search: addresses, cities, ZIP codes
- Geographic: map viewport bounds, radius search (lat/lng + miles)
- Filters: price range, beds/baths, property type, status, sqft, year built
- Sorting: price (asc/desc), newest, bedrooms

### SEO URL Structure (from PRD)
- Listings: `/listings/[city]-[state]/[street-address]-[mls-id]`
- Search: `/search/[city]-[state]?beds=3&maxPrice=500000`
- City pages: `/homes-for-sale/[city]-[state]`

### Performance Targets (from PRD)
- TTFB: < 200ms
- LCP: < 2.5s
- Search response: < 500ms
- Map load: < 1s after page load

### Mobile-First Breakpoints
- Mobile: 320px
- Tablet: 768px
- Desktop: 1024px

## Data Source Details

From kvCORE feed analysis:
- ~2,170 listings, 100% with lat/long
- 67.6% have virtual tours, 19.9% have open houses
- Average 35.7 photos per listing
- Property types: Single Family (52%), Condo (30%), Vacant Land (11%)
- Status: Active (61%), For Rent (27%), Pending (10%)
- Covers Florida and Ohio markets (additional feeds planned)
