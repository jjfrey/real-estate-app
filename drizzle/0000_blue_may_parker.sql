CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255),
	"license_num" varchar(50),
	"phone" varchar(50),
	"photo_url" text,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo_url" text,
	"website" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"description" text,
	"enabled_global" boolean DEFAULT false,
	"enabled_sites" text,
	"rollout_percentage" integer DEFAULT 100,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"agent_id" integer,
	"office_id" integer,
	"invited_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"agent_id" integer,
	"office_id" integer,
	"lead_type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"message" text,
	"preferred_tour_date" date,
	"preferred_tour_time" varchar(20),
	"status" varchar(20) DEFAULT 'new',
	"notes" text,
	"site_id" varchar(50),
	"contacted_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "link_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"mls_id" text NOT NULL,
	"campaign" text,
	"source" text DEFAULT 'magazine',
	"click_id" text,
	"user_agent" text,
	"ip_address" text,
	"referer" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "link_clicks_click_id_unique" UNIQUE("click_id")
);
--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"sort_order" smallint DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"mls_id" varchar(50) NOT NULL,
	"internal_mls_id" varchar(50),
	"mls_board" varchar(100),
	"street_address" varchar(255) NOT NULL,
	"unit_number" varchar(50),
	"city" varchar(100) NOT NULL,
	"state" varchar(2) NOT NULL,
	"zip" varchar(10) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"status" varchar(50) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"listing_url" text,
	"virtual_tour_url" text,
	"property_type" varchar(50),
	"description" text,
	"bedrooms" smallint,
	"bathrooms" numeric(3, 1),
	"full_bathrooms" smallint,
	"half_bathrooms" smallint,
	"living_area" integer,
	"lot_size" numeric(10, 5),
	"year_built" smallint,
	"pets_allowed" boolean,
	"agent_id" integer,
	"office_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "listings_mls_id_unique" UNIQUE("mls_id")
);
--> statement-breakpoint
CREATE TABLE "office_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"name" varchar(255),
	"brokerage_name" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"street_address" varchar(255),
	"city" varchar(100),
	"state" varchar(2),
	"zip" varchar(10),
	"logo_url" text,
	"lead_routing_email" varchar(255),
	"route_to_team_lead" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "open_houses" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "saved_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"listing_id" integer NOT NULL,
	"site_id" varchar(50),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_listing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" varchar(50) NOT NULL,
	"state" varchar(2),
	"min_price" numeric(12, 2),
	"max_price" numeric(12, 2),
	"property_types" text,
	"statuses" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"brand_config" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_feeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"description" text,
	"feed_url" text,
	"feed_type" varchar(20) DEFAULT 'xml' NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"company_id" integer,
	"schedule_enabled" boolean DEFAULT false,
	"schedule_frequency" varchar(20) DEFAULT 'daily',
	"schedule_time" time DEFAULT '03:00:00',
	"schedule_day_of_week" smallint,
	"last_scheduled_run" timestamp with time zone,
	"next_scheduled_run" timestamp with time zone,
	"priority" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sync_feeds_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"trigger" varchar(20) NOT NULL,
	"triggered_by" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"listings_created" integer DEFAULT 0,
	"listings_updated" integer DEFAULT 0,
	"listings_deleted" integer DEFAULT 0,
	"agents_created" integer DEFAULT 0,
	"agents_updated" integer DEFAULT 0,
	"offices_created" integer DEFAULT 0,
	"offices_updated" integer DEFAULT 0,
	"photos_processed" integer DEFAULT 0,
	"open_houses_processed" integer DEFAULT 0,
	"company_conflicts" integer DEFAULT 0,
	"company_conflict_details" text,
	"error_message" text,
	"error_stack" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"password" text,
	"role" varchar(20) DEFAULT 'consumer',
	"site_id" varchar(50),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_admins" ADD CONSTRAINT "company_admins_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_admins" ADD CONSTRAINT "company_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_admins" ADD CONSTRAINT "office_admins_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_admins" ADD CONSTRAINT "office_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offices" ADD CONSTRAINT "offices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_houses" ADD CONSTRAINT "open_houses_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_listing_rules" ADD CONSTRAINT "site_listing_rules_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_feeds" ADD CONSTRAINT "sync_feeds_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_feed_id_sync_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."sync_feeds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user_id" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agents_email" ON "agents" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agents_user_id" ON "agents" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_companies_slug" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_companies_name" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_company_admins_company" ON "company_admins" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_admins_user" ON "company_admins" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_company_admins_unique" ON "company_admins" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_feature_flags_key" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invitations_token" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_invitations_email" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_leads_listing" ON "leads" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_leads_agent" ON "leads" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_leads_office" ON "leads" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_leads_site" ON "leads" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_leads_created" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_link_clicks_mls_id" ON "link_clicks" USING btree ("mls_id");--> statement-breakpoint
CREATE INDEX "idx_link_clicks_campaign" ON "link_clicks" USING btree ("campaign");--> statement-breakpoint
CREATE INDEX "idx_link_clicks_created_at" ON "link_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_photos_listing" ON "listing_photos" USING btree ("listing_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_listings_mls_id" ON "listings" USING btree ("mls_id");--> statement-breakpoint
CREATE INDEX "idx_listings_city" ON "listings" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_listings_status" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_listings_price" ON "listings" USING btree ("price");--> statement-breakpoint
CREATE INDEX "idx_listings_property_type" ON "listings" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "idx_listings_beds_baths" ON "listings" USING btree ("bedrooms","bathrooms");--> statement-breakpoint
CREATE INDEX "idx_listings_lat_lng" ON "listings" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_office_admins_office" ON "office_admins" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_office_admins_user" ON "office_admins" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_office_admins_unique" ON "office_admins" USING btree ("office_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_offices_name" ON "offices" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_offices_company" ON "offices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_open_houses_listing" ON "open_houses" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_open_houses_date" ON "open_houses" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_password_reset_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_password_reset_user" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_saved_listings_user" ON "saved_listings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_saved_listings_listing" ON "saved_listings" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_saved_listings_site" ON "saved_listings" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_saved_listings_user_listing" ON "saved_listings" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_site_listing_rules_site" ON "site_listing_rules" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_site_listing_rules_state" ON "site_listing_rules" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sync_feeds_slug" ON "sync_feeds" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_sync_feeds_enabled" ON "sync_feeds" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_sync_feeds_company" ON "sync_feeds" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_sync_logs_feed" ON "sync_logs" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "idx_sync_logs_status" ON "sync_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sync_logs_created" ON "sync_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_site" ON "users" USING btree ("site_id");