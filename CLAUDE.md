# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DistinctiveHomes** is a Zillow/Redfin-style real estate listing platform for Florida properties. It's powered by BoldTrail/kvCORE XML data feed with ~2,170 listings covering Florida markets.

### Current Phase: Phase 1 (Listings & Search/Discovery)
- Phase 1: Listings, Search & Discovery ← **Current**
- Phase 2: Lead Capture (planned)
- Phase 3: User Accounts (planned)

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
```

## Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL with Drizzle ORM
- **Maps:** Mapbox GL JS
- **Data Source:** kvCORE XML feed (daily sync)

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── listings/route.ts         # GET listings with filtering
│   │   ├── listings/[id]/route.ts    # GET single listing
│   │   ├── search/autocomplete/      # Search suggestions
│   │   └── cities/route.ts           # City list with counts
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
│   └── queries.ts                    # Database query builders
└── types/
    └── listing.ts                    # TypeScript interfaces

scripts/
└── sync-feed.ts                      # MLS XML feed importer
```

### Database Schema

Five core tables with relationships:
- **listings** - Properties (address, price, beds/baths, coordinates, status)
- **listing_photos** - Images per listing (cascade delete)
- **agents** - Real estate agents
- **offices** - Brokerage offices
- **open_houses** - Scheduled showing events

Key indexes for performance: geographic (lat/lng), city, status, price, property_type, beds_baths.

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/listings` | Filtered listings with pagination, supports bounds/radius search |
| `GET /api/listings/[id]` | Full listing with photos, agent, office, open houses |
| `GET /api/search/autocomplete` | Address/city/ZIP suggestions |
| `GET /api/cities` | Cities with listing counts |

### Data Flow
1. User search → API route parses filters → Drizzle builds query
2. Database query with indexes → Photo lookup → Paginated response
3. Feed sync: XML → Parse → Upsert listings by mls_id

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/distincthomes
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token
NEXT_PUBLIC_APP_URL=http://localhost:3000
KVCORE_FEED_URL=https://api.kvcore.com/export/listings/YOUR_KEY/4
```

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
- 2,170 listings, 100% with lat/long
- 67.6% have virtual tours, 19.9% have open houses
- Average 35.7 photos per listing
- Property types: Single Family (52%), Condo (30%), Vacant Land (11%)
- Status: Active (61%), For Rent (27%), Pending (10%)
- Top cities: Naples, Vero Beach, Fort Myers, Stuart, Sarasota
