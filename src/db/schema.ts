import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  smallint,
  decimal,
  boolean,
  timestamp,
  date,
  time,
  index,
  uniqueIndex,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Agents table
export const agents = pgTable(
  "agents",
  {
    id: serial("id").primaryKey(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 255 }),
    licenseNum: varchar("license_num", { length: 50 }),
    phone: varchar("phone", { length: 50 }),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_agents_email").on(table.email),
  ]
);

// Offices table
export const offices = pgTable(
  "offices",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }),
    brokerageName: varchar("brokerage_name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    streetAddress: varchar("street_address", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 2 }),
    zip: varchar("zip", { length: 10 }),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_offices_name").on(table.name),
  ]
);

// Listings table
export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    mlsId: varchar("mls_id", { length: 50 }).notNull().unique(),
    internalMlsId: varchar("internal_mls_id", { length: 50 }),
    mlsBoard: varchar("mls_board", { length: 100 }),

    // Location
    streetAddress: varchar("street_address", { length: 255 }).notNull(),
    unitNumber: varchar("unit_number", { length: 50 }),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    zip: varchar("zip", { length: 10 }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    // Listing details
    status: varchar("status", { length: 50 }).notNull(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    listingUrl: text("listing_url"),
    virtualTourUrl: text("virtual_tour_url"),

    // Property details
    propertyType: varchar("property_type", { length: 50 }),
    description: text("description"),
    bedrooms: smallint("bedrooms"),
    bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
    fullBathrooms: smallint("full_bathrooms"),
    halfBathrooms: smallint("half_bathrooms"),
    livingArea: integer("living_area"),
    lotSize: decimal("lot_size", { precision: 10, scale: 5 }),
    yearBuilt: smallint("year_built"),

    // Rental
    petsAllowed: boolean("pets_allowed"),

    // Relationships
    agentId: integer("agent_id").references(() => agents.id),
    officeId: integer("office_id").references(() => offices.id),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_listings_mls_id").on(table.mlsId),
    index("idx_listings_city").on(table.city),
    index("idx_listings_status").on(table.status),
    index("idx_listings_price").on(table.price),
    index("idx_listings_property_type").on(table.propertyType),
    index("idx_listings_beds_baths").on(table.bedrooms, table.bathrooms),
    index("idx_listings_lat_lng").on(table.latitude, table.longitude),
  ]
);

// Listing photos table
export const listingPhotos = pgTable(
  "listing_photos",
  {
    id: serial("id").primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    caption: text("caption"),
    sortOrder: smallint("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_photos_listing").on(table.listingId, table.sortOrder),
  ]
);

// Open houses table
export const openHouses = pgTable(
  "open_houses",
  {
    id: serial("id").primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_open_houses_listing").on(table.listingId),
    index("idx_open_houses_date").on(table.date),
  ]
);

// Relations
export const listingsRelations = relations(listings, ({ one, many }) => ({
  agent: one(agents, {
    fields: [listings.agentId],
    references: [agents.id],
  }),
  office: one(offices, {
    fields: [listings.officeId],
    references: [offices.id],
  }),
  photos: many(listingPhotos),
  openHouses: many(openHouses),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  listings: many(listings),
}));

export const officesRelations = relations(offices, ({ many }) => ({
  listings: many(listings),
}));

export const listingPhotosRelations = relations(listingPhotos, ({ one }) => ({
  listing: one(listings, {
    fields: [listingPhotos.listingId],
    references: [listings.id],
  }),
}));

export const openHousesRelations = relations(openHouses, ({ one }) => ({
  listing: one(listings, {
    fields: [openHouses.listingId],
    references: [listings.id],
  }),
}));

// Types
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Office = typeof offices.$inferSelect;
export type NewOffice = typeof offices.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type NewListingPhoto = typeof listingPhotos.$inferInsert;
export type OpenHouse = typeof openHouses.$inferSelect;
export type NewOpenHouse = typeof openHouses.$inferInsert;
