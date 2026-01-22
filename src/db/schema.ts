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
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// NextAuth.js Tables
// ==========================================

// Users table (for NextAuth)
export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    password: text("password"), // For credentials auth (hashed)
    role: varchar("role", { length: 20 }).default("consumer"), // 'consumer' | 'agent' | 'office_admin' | 'company_admin' | 'super_admin'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_users_role").on(table.role)]
);

// Accounts table (for OAuth providers)
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("idx_accounts_user_id").on(account.userId),
  ]
);

// Sessions table
export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => [index("idx_sessions_user_id").on(session.userId)]
);

// Verification tokens (for email verification)
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// Password reset tokens
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_password_reset_token").on(table.token),
    index("idx_password_reset_user").on(table.userId),
  ]
);

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  savedListings: many(savedListings),
  officeAdminRoles: many(officeAdmins),
  companyAdminRoles: many(companyAdmins),
  agent: one(agents, {
    fields: [users.id],
    references: [agents.userId],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ==========================================
// Real Estate App Tables
// ==========================================

// Companies table (e.g., Berkshire Hathaway)
export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    logoUrl: text("logo_url"),
    website: varchar("website", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_companies_slug").on(table.slug),
    index("idx_companies_name").on(table.name),
  ]
);

// Company admins junction table (many-to-many: companies <-> users)
export const companyAdmins = pgTable(
  "company_admins",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_company_admins_company").on(table.companyId),
    index("idx_company_admins_user").on(table.userId),
    uniqueIndex("idx_company_admins_unique").on(table.companyId, table.userId),
  ]
);

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
    userId: text("user_id").references(() => users.id), // Link to portal user account
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_agents_email").on(table.email),
    uniqueIndex("idx_agents_user_id").on(table.userId),
  ]
);

// Offices table
export const offices = pgTable(
  "offices",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }),
    brokerageName: varchar("brokerage_name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    streetAddress: varchar("street_address", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 2 }),
    zip: varchar("zip", { length: 10 }),
    logoUrl: text("logo_url"),
    leadRoutingEmail: varchar("lead_routing_email", { length: 255 }),
    routeToTeamLead: boolean("route_to_team_lead").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_offices_name").on(table.name),
    index("idx_offices_company").on(table.companyId),
  ]
);

// Office admins junction table (many-to-many: offices <-> users)
export const officeAdmins = pgTable(
  "office_admins",
  {
    id: serial("id").primaryKey(),
    officeId: integer("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_office_admins_office").on(table.officeId),
    index("idx_office_admins_user").on(table.userId),
    uniqueIndex("idx_office_admins_unique").on(table.officeId, table.userId),
  ]
);

// Invitations table for agent/office admin onboarding
export const invitations = pgTable(
  "invitations",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    type: varchar("type", { length: 20 }).notNull(), // 'agent' | 'office_admin'
    agentId: integer("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    officeId: integer("office_id").references(() => offices.id, { onDelete: "cascade" }),
    invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_invitations_token").on(table.token),
    index("idx_invitations_email").on(table.email),
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

// Leads table
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    agentId: integer("agent_id").references(() => agents.id),
    officeId: integer("office_id").references(() => offices.id),
    leadType: varchar("lead_type", { length: 20 }).notNull(), // 'info_request' | 'tour_request'
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    message: text("message"),
    preferredTourDate: date("preferred_tour_date"),
    preferredTourTime: varchar("preferred_tour_time", { length: 20 }),
    status: varchar("status", { length: 20 }).default("new"), // 'new' | 'contacted' | 'converted' | 'closed'
    notes: text("notes"),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_leads_listing").on(table.listingId),
    index("idx_leads_agent").on(table.agentId),
    index("idx_leads_office").on(table.officeId),
    index("idx_leads_status").on(table.status),
    index("idx_leads_created").on(table.createdAt),
  ]
);

// Sync feeds table (supports multiple data feeds)
export const syncFeeds = pgTable(
  "sync_feeds",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(), // e.g., "kvCORE MLS Feed"
    slug: varchar("slug", { length: 50 }).notNull().unique(), // e.g., "kvcore-mls"
    description: text("description"),
    feedUrl: text("feed_url"), // URL to fetch data from
    feedType: varchar("feed_type", { length: 20 }).notNull().default("xml"), // 'xml' | 'json' | 'api'
    isEnabled: boolean("is_enabled").default(true),
    // Schedule configuration
    scheduleEnabled: boolean("schedule_enabled").default(false),
    scheduleFrequency: varchar("schedule_frequency", { length: 20 }).default("daily"), // 'hourly' | 'every_6_hours' | 'every_12_hours' | 'daily' | 'weekly'
    scheduleTime: time("schedule_time").default("03:00:00"), // Time of day for daily/weekly syncs (UTC)
    scheduleDayOfWeek: smallint("schedule_day_of_week"), // 0-6 for weekly syncs (0 = Sunday)
    lastScheduledRun: timestamp("last_scheduled_run", { withTimezone: true }),
    nextScheduledRun: timestamp("next_scheduled_run", { withTimezone: true }),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_sync_feeds_slug").on(table.slug),
    index("idx_sync_feeds_enabled").on(table.isEnabled),
  ]
);

// Sync logs table (MLS feed sync history)
export const syncLogs = pgTable(
  "sync_logs",
  {
    id: serial("id").primaryKey(),
    feedId: integer("feed_id").references(() => syncFeeds.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'running' | 'completed' | 'failed'
    trigger: varchar("trigger", { length: 20 }).notNull(), // 'manual' | 'scheduled' | 'webhook'
    triggeredBy: text("triggered_by").references(() => users.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Sync statistics
    listingsCreated: integer("listings_created").default(0),
    listingsUpdated: integer("listings_updated").default(0),
    listingsDeleted: integer("listings_deleted").default(0),
    agentsCreated: integer("agents_created").default(0),
    agentsUpdated: integer("agents_updated").default(0),
    officesCreated: integer("offices_created").default(0),
    officesUpdated: integer("offices_updated").default(0),
    photosProcessed: integer("photos_processed").default(0),
    openHousesProcessed: integer("open_houses_processed").default(0),
    // Error tracking
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_sync_logs_feed").on(table.feedId),
    index("idx_sync_logs_status").on(table.status),
    index("idx_sync_logs_created").on(table.createdAt),
  ]
);

// Saved listings table (user favorites)
export const savedListings = pgTable(
  "saved_listings",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_saved_listings_user").on(table.userId),
    index("idx_saved_listings_listing").on(table.listingId),
    uniqueIndex("idx_saved_listings_user_listing").on(table.userId, table.listingId),
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
  savedBy: many(savedListings),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  listings: many(listings),
  leads: many(leads),
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  offices: many(offices),
  admins: many(companyAdmins),
}));

export const companyAdminsRelations = relations(companyAdmins, ({ one }) => ({
  company: one(companies, {
    fields: [companyAdmins.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [companyAdmins.userId],
    references: [users.id],
  }),
}));

export const officesRelations = relations(offices, ({ one, many }) => ({
  company: one(companies, {
    fields: [offices.companyId],
    references: [companies.id],
  }),
  listings: many(listings),
  leads: many(leads),
  admins: many(officeAdmins),
}));

export const officeAdminsRelations = relations(officeAdmins, ({ one }) => ({
  office: one(offices, {
    fields: [officeAdmins.officeId],
    references: [offices.id],
  }),
  user: one(users, {
    fields: [officeAdmins.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  agent: one(agents, {
    fields: [invitations.agentId],
    references: [agents.id],
  }),
  office: one(offices, {
    fields: [invitations.officeId],
    references: [offices.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
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

export const leadsRelations = relations(leads, ({ one }) => ({
  listing: one(listings, {
    fields: [leads.listingId],
    references: [listings.id],
  }),
  agent: one(agents, {
    fields: [leads.agentId],
    references: [agents.id],
  }),
  office: one(offices, {
    fields: [leads.officeId],
    references: [offices.id],
  }),
}));

export const savedListingsRelations = relations(savedListings, ({ one }) => ({
  user: one(users, {
    fields: [savedListings.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [savedListings.listingId],
    references: [listings.id],
  }),
}));

export const syncFeedsRelations = relations(syncFeeds, ({ many }) => ({
  logs: many(syncLogs),
}));

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  feed: one(syncFeeds, {
    fields: [syncLogs.feedId],
    references: [syncFeeds.id],
  }),
  triggeredByUser: one(users, {
    fields: [syncLogs.triggeredBy],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
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
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type SavedListing = typeof savedListings.$inferSelect;
export type NewSavedListing = typeof savedListings.$inferInsert;
export type OfficeAdmin = typeof officeAdmins.$inferSelect;
export type NewOfficeAdmin = typeof officeAdmins.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;
export type SyncFeed = typeof syncFeeds.$inferSelect;
export type NewSyncFeed = typeof syncFeeds.$inferInsert;

// Company types
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type CompanyAdmin = typeof companyAdmins.$inferSelect;
export type NewCompanyAdmin = typeof companyAdmins.$inferInsert;

// Role type
export type UserRole = "consumer" | "agent" | "office_admin" | "company_admin" | "super_admin";
export type PortalRole = "agent" | "office_admin" | "company_admin" | "super_admin";
