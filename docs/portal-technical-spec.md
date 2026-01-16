# Agent/Office Portal - Technical Specification

## Overview

A role-based portal for agents and office administrators to manage leads generated from the real estate listing platform. Includes invite-based onboarding and a super admin panel for platform management.

---

## 1. Role Hierarchy

| Role | Description | Access Level |
|------|-------------|--------------|
| `super_admin` | Platform owner/operator | Full access to all data and settings |
| `office_admin` | Brokerage manager | Access to all leads/agents for their office(s) |
| `agent` | Individual realtor | Access to their own leads only |
| `consumer` | Home buyer/seller | Existing user type, no portal access |

---

## 2. Schema Changes

### 2.1 Modify `users` Table

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'consumer';
-- Values: 'consumer' | 'agent' | 'office_admin' | 'super_admin'

CREATE INDEX idx_users_role ON users(role);
```

**Drizzle schema addition:**
```typescript
// In users table definition
role: varchar("role", { length: 20 }).default("consumer"),
```

### 2.2 Modify `agents` Table

```sql
ALTER TABLE agents ADD COLUMN user_id TEXT REFERENCES users(id);

CREATE UNIQUE INDEX idx_agents_user_id ON agents(user_id);
```

**Drizzle schema addition:**
```typescript
// In agents table definition
userId: text("user_id").references(() => users.id),
```

### 2.3 New `office_admins` Junction Table

Allows multiple admins per office and one admin to manage multiple offices.

```sql
CREATE TABLE office_admins (
  id SERIAL PRIMARY KEY,
  office_id INTEGER NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, user_id)
);

CREATE INDEX idx_office_admins_office ON office_admins(office_id);
CREATE INDEX idx_office_admins_user ON office_admins(user_id);
```

**Drizzle schema:**
```typescript
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
```

### 2.4 New `invitations` Table

Tracks pending invitations for agents and office admins.

```sql
CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL,              -- 'agent' | 'office_admin'
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_pending ON invitations(accepted_at) WHERE accepted_at IS NULL;
```

**Drizzle schema:**
```typescript
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
```

### 2.5 Modify `leads` Table

Add notes field for lead management.

```sql
ALTER TABLE leads ADD COLUMN notes TEXT;
ALTER TABLE leads ADD COLUMN contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN converted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN closed_at TIMESTAMPTZ;
```

**Drizzle schema additions:**
```typescript
// In leads table definition
notes: text("notes"),
contactedAt: timestamp("contacted_at", { withTimezone: true }),
convertedAt: timestamp("converted_at", { withTimezone: true }),
closedAt: timestamp("closed_at", { withTimezone: true }),
```

---

## 3. API Endpoints

### 3.1 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/portal/auth/login` | Email/password login | Public |
| POST | `/api/portal/auth/logout` | End session | Authenticated |
| POST | `/api/portal/auth/register` | Accept invite & create account | Public (valid token) |
| POST | `/api/portal/auth/forgot-password` | Request password reset | Public |
| POST | `/api/portal/auth/reset-password` | Reset password with token | Public (valid token) |
| GET | `/api/portal/auth/me` | Get current user + role | Authenticated |

#### POST `/api/portal/auth/login`
```typescript
// Request
{ email: string; password: string }

// Response 200
{
  user: { id, email, name, role },
  agent?: { id, firstName, lastName, ... },      // if role=agent
  offices?: [{ id, name, ... }]                   // if role=office_admin
}

// Response 401
{ error: "Invalid credentials" }
```

#### POST `/api/portal/auth/register`
```typescript
// Request
{
  token: string;           // Invitation token
  name: string;
  password: string;
}

// Response 200
{ user: { id, email, name, role } }

// Response 400
{ error: "Invalid or expired invitation" }
```

### 3.2 Invitations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/portal/invitations` | List pending invitations | Super Admin |
| POST | `/api/portal/invitations` | Create & send invitation | Super Admin, Office Admin |
| DELETE | `/api/portal/invitations/[id]` | Revoke invitation | Super Admin, Office Admin |
| GET | `/api/portal/invitations/validate/[token]` | Validate token | Public |

#### POST `/api/portal/invitations`
```typescript
// Request
{
  email: string;
  type: "agent" | "office_admin";
  agentId?: number;    // Required if type=agent
  officeId?: number;   // Required if type=office_admin
}

// Response 201
{ invitation: { id, email, type, expiresAt } }

// Response 403
{ error: "Office admins can only invite agents from their office" }
```

#### GET `/api/portal/invitations/validate/[token]`
```typescript
// Response 200
{
  valid: true,
  invitation: {
    email: string,
    type: "agent" | "office_admin",
    agent?: { firstName, lastName },
    office?: { name }
  }
}

// Response 400
{ valid: false, error: "Invitation expired" }
```

### 3.3 Leads

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/portal/leads` | List leads (filtered by role) | Agent, Office Admin, Super Admin |
| GET | `/api/portal/leads/[id]` | Get lead detail | Owner or higher |
| PATCH | `/api/portal/leads/[id]` | Update lead status/notes | Owner or higher |
| GET | `/api/portal/leads/stats` | Lead statistics | Agent, Office Admin, Super Admin |

#### GET `/api/portal/leads`
```typescript
// Query params
{
  status?: "new" | "contacted" | "converted" | "closed";
  agentId?: number;       // Super admin only
  officeId?: number;      // Super admin only
  page?: number;
  limit?: number;
  sort?: "createdAt" | "status";
  sortDir?: "asc" | "desc";
}

// Response 200
{
  leads: [{
    id, name, email, phone, leadType, status, createdAt,
    listing: { id, streetAddress, city, price },
    agent: { id, firstName, lastName },
    office: { id, name }
  }],
  pagination: { page, limit, total, totalPages }
}
```

#### PATCH `/api/portal/leads/[id]`
```typescript
// Request
{
  status?: "new" | "contacted" | "converted" | "closed";
  notes?: string;
}

// Response 200
{ lead: { ... } }
```

#### GET `/api/portal/leads/stats`
```typescript
// Response 200
{
  total: number,
  byStatus: {
    new: number,
    contacted: number,
    converted: number,
    closed: number
  },
  thisWeek: number,
  thisMonth: number
}
```

### 3.4 Agents (Office Admin & Super Admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/portal/agents` | List agents | Office Admin (own), Super Admin (all) |
| GET | `/api/portal/agents/[id]` | Get agent detail | Office Admin (own), Super Admin |

#### GET `/api/portal/agents`
```typescript
// Query params
{
  officeId?: number;       // Filter by office
  hasAccount?: boolean;    // Filter by portal access
  page?: number;
  limit?: number;
}

// Response 200
{
  agents: [{
    id, firstName, lastName, email, phone, photoUrl,
    userId: string | null,   // null = no portal account
    leadCount: number,
    office: { id, name }
  }],
  pagination: { ... }
}
```

### 3.5 Offices (Super Admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/portal/offices` | List all offices | Super Admin |
| GET | `/api/portal/offices/[id]` | Get office detail | Office Admin (own), Super Admin |
| PATCH | `/api/portal/offices/[id]` | Update office settings | Office Admin (own), Super Admin |

#### GET `/api/portal/offices`
```typescript
// Response 200
{
  offices: [{
    id, name, brokerageName, city, state,
    agentCount: number,
    leadCount: number,
    adminCount: number
  }]
}
```

### 3.6 Users (Super Admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/portal/users` | List portal users | Super Admin |
| PATCH | `/api/portal/users/[id]` | Update user role | Super Admin |
| DELETE | `/api/portal/users/[id]` | Deactivate user | Super Admin |

### 3.7 Sync (Super Admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/portal/sync/status` | Get last sync info | Super Admin |
| POST | `/api/portal/sync/trigger` | Trigger manual sync | Super Admin |

---

## 4. Page Structure

```
/portal
├── (auth)/                         # Public auth pages (no layout)
│   ├── login/page.tsx
│   ├── register/page.tsx           # ?token=xxx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx     # ?token=xxx
│
├── (dashboard)/                    # Protected with portal layout
│   ├── layout.tsx                  # Sidebar nav, role-based menu
│   ├── page.tsx                    # Dashboard home (redirects or shows overview)
│   │
│   ├── leads/
│   │   ├── page.tsx                # Lead list with filters
│   │   └── [id]/page.tsx           # Lead detail
│   │
│   ├── office/                     # Office Admin only
│   │   ├── page.tsx                # Office overview
│   │   ├── agents/page.tsx         # Agent list + invite
│   │   └── settings/page.tsx       # Office settings
│   │
│   ├── admin/                      # Super Admin only
│   │   ├── page.tsx                # Admin overview
│   │   ├── offices/page.tsx        # All offices
│   │   ├── agents/page.tsx         # All agents
│   │   ├── leads/page.tsx          # All leads
│   │   ├── users/page.tsx          # Portal users
│   │   ├── invitations/page.tsx    # Pending invites
│   │   └── sync/page.tsx           # Sync status/controls
│   │
│   └── settings/
│       └── page.tsx                # Personal settings
```

---

## 5. Components

### 5.1 Layout Components

| Component | Description |
|-----------|-------------|
| `PortalLayout` | Main layout with sidebar, header, user menu |
| `PortalSidebar` | Navigation sidebar, role-aware menu items |
| `PortalHeader` | Top bar with breadcrumbs, user dropdown |
| `RoleGate` | Wrapper that checks role before rendering children |

### 5.2 Lead Components

| Component | Description |
|-----------|-------------|
| `LeadList` | Table/card list of leads with filters |
| `LeadCard` | Individual lead summary card |
| `LeadDetail` | Full lead view with status management |
| `LeadStatusBadge` | Color-coded status indicator |
| `LeadStatusSelect` | Dropdown to change lead status |
| `LeadNotes` | Notes textarea with save |
| `LeadStats` | Statistics cards (total, by status, etc.) |

### 5.3 Agent Components

| Component | Description |
|-----------|-------------|
| `AgentList` | Table of agents with invite buttons |
| `AgentCard` | Agent summary with lead count |
| `InviteAgentModal` | Modal to send agent invitation |

### 5.4 Office Components

| Component | Description |
|-----------|-------------|
| `OfficeList` | Table of offices for super admin |
| `OfficeCard` | Office summary with stats |
| `InviteOfficeAdminModal` | Modal to invite office admin |
| `OfficeSettings` | Form to edit office details |

### 5.5 Admin Components

| Component | Description |
|-----------|-------------|
| `UserList` | Table of portal users |
| `InvitationList` | Table of pending invitations |
| `SyncStatus` | Last sync info + trigger button |

### 5.6 Auth Components

| Component | Description |
|-----------|-------------|
| `LoginForm` | Email/password form |
| `RegisterForm` | Name/password form (token-based) |
| `ForgotPasswordForm` | Email input for reset |
| `ResetPasswordForm` | New password input |

---

## 6. Authentication & Authorization

### 6.1 Session Management

Use existing NextAuth setup with additional checks:

```typescript
// lib/portal-auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getPortalSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  // Fetch user with role from database
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  if (!user || user.role === "consumer") return null;

  return { ...session, user: { ...session.user, role: user.role } };
}

export type PortalRole = "agent" | "office_admin" | "super_admin";

export function requireRole(allowedRoles: PortalRole[]) {
  return async function(req: Request) {
    const session = await getPortalSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (!allowedRoles.includes(session.user.role as PortalRole)) {
      return new Response("Forbidden", { status: 403 });
    }
    return session;
  };
}
```

### 6.2 Middleware

```typescript
// middleware.ts (add to existing)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Portal routes (except auth pages) require authentication
  if (pathname.startsWith("/portal") &&
      !pathname.startsWith("/portal/login") &&
      !pathname.startsWith("/portal/register") &&
      !pathname.startsWith("/portal/forgot-password") &&
      !pathname.startsWith("/portal/reset-password")) {
    // Check for session cookie
    const sessionToken = request.cookies.get("next-auth.session-token");
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
  }

  return NextResponse.next();
}
```

### 6.3 Role-Based Data Access

```typescript
// Example: Get leads based on user role
async function getLeadsForUser(userId: string, role: PortalRole) {
  switch (role) {
    case "super_admin":
      // All leads
      return db.query.leads.findMany({ ... });

    case "office_admin":
      // Leads for offices user manages
      const userOffices = await db.query.officeAdmins.findMany({
        where: eq(officeAdmins.userId, userId),
      });
      const officeIds = userOffices.map(o => o.officeId);
      return db.query.leads.findMany({
        where: inArray(leads.officeId, officeIds),
      });

    case "agent":
      // Only agent's own leads
      const agent = await db.query.agents.findFirst({
        where: eq(agents.userId, userId),
      });
      return db.query.leads.findMany({
        where: eq(leads.agentId, agent.id),
      });
  }
}
```

---

## 7. Invite Flow Details

### 7.1 Creating an Invitation

```typescript
// POST /api/portal/invitations
async function createInvitation(data: {
  email: string;
  type: "agent" | "office_admin";
  agentId?: number;
  officeId?: number;
  invitedBy: string;
}) {
  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");

  // Set expiration (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create invitation record
  const invitation = await db.insert(invitations).values({
    email: data.email,
    token,
    type: data.type,
    agentId: data.agentId,
    officeId: data.officeId,
    invitedBy: data.invitedBy,
    expiresAt,
  }).returning();

  // Send email
  await sendInvitationEmail({
    to: data.email,
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/register?token=${token}`,
    type: data.type,
    // Include agent/office name for personalization
  });

  return invitation;
}
```

### 7.2 Accepting an Invitation

```typescript
// POST /api/portal/auth/register
async function acceptInvitation(data: {
  token: string;
  name: string;
  password: string;
}) {
  // Validate token
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.token, data.token),
      isNull(invitations.acceptedAt),
      gt(invitations.expiresAt, new Date())
    ),
  });

  if (!invitation) {
    throw new Error("Invalid or expired invitation");
  }

  // Create user account
  const hashedPassword = await bcrypt.hash(data.password, 12);
  const role = invitation.type === "agent" ? "agent" : "office_admin";

  const user = await db.insert(users).values({
    email: invitation.email,
    name: data.name,
    password: hashedPassword,
    role,
  }).returning();

  // Link to agent or office
  if (invitation.type === "agent" && invitation.agentId) {
    await db.update(agents)
      .set({ userId: user[0].id })
      .where(eq(agents.id, invitation.agentId));
  } else if (invitation.type === "office_admin" && invitation.officeId) {
    await db.insert(officeAdmins).values({
      officeId: invitation.officeId,
      userId: user[0].id,
    });
  }

  // Mark invitation as accepted
  await db.update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invitation.id));

  return user[0];
}
```

---

## 8. Email Templates

### 8.1 Agent Invitation

**Subject:** You're invited to join [Platform Name]

```
Hi [Agent First Name],

You've been invited to access the agent portal for [Platform Name].

As a registered agent, you'll be able to:
- View and manage leads for your listings
- Track lead status and add notes
- Update your notification preferences

Click the link below to create your account:
[Accept Invitation Button]

This invitation expires in 7 days.

If you didn't expect this invitation, you can ignore this email.
```

### 8.2 Office Admin Invitation

**Subject:** You're invited to manage [Office Name] on [Platform Name]

```
Hi,

You've been invited to manage [Office Name] on [Platform Name].

As an office administrator, you'll be able to:
- View all leads for your office
- Invite and manage agents
- Access office-wide reporting

Click the link below to create your account:
[Accept Invitation Button]

This invitation expires in 7 days.
```

### 8.3 Password Reset

**Subject:** Reset your password

```
Hi [Name],

We received a request to reset your password for [Platform Name].

Click the link below to set a new password:
[Reset Password Button]

This link expires in 1 hour.

If you didn't request this, you can ignore this email.
```

---

## 9. Seed Script

### 9.1 Super Admin Seeder

```typescript
// scripts/seed-admin.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD env vars");
    process.exit(1);
  }

  // Check if already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    console.log("Super admin already exists, updating role...");
    await db.update(users)
      .set({ role: "super_admin" })
      .where(eq(users.email, email));
  } else {
    console.log("Creating super admin account...");
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      email,
      name,
      password: hashedPassword,
      role: "super_admin",
    });
  }

  console.log(`Super admin ready: ${email}`);
}

seedSuperAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

### 9.2 Package.json Script

```json
{
  "scripts": {
    "db:seed-admin": "npx tsx scripts/seed-admin.ts"
  }
}
```

---

## 10. Implementation Phases

### Phase 1: Foundation
1. Schema migrations (users.role, agents.userId, office_admins, invitations, leads additions)
2. Seed script for super admin
3. Portal auth (login, session management, role checks)
4. Basic portal layout with role-based navigation

### Phase 2: Lead Management
1. Lead list API with role-based filtering
2. Lead detail API with status updates
3. Lead list page with filters
4. Lead detail page with status management

### Phase 3: Invite System
1. Invitations API (create, validate, list, revoke)
2. Register page (token-based)
3. Email sending integration
4. Invitation management UI for admins

### Phase 4: Office Admin Features
1. Agent list with invite capability
2. Office settings page
3. Office-level lead filtering

### Phase 5: Super Admin Features
1. Office management page
2. All agents view
3. All leads view
4. User management
5. Sync status/controls

---

## 11. Open Questions

1. **Password requirements:** Minimum length, complexity rules?
2. **Session duration:** How long before requiring re-login?
3. **Email provider:** Continue using Resend for invite/reset emails?
4. **Notification preferences:** What options should agents have? (email on new lead, daily digest, etc.)
5. **Lead assignment:** If `routeToTeamLead` is true, does office admin manually assign, or is it automatic?

---

## 12. Security Considerations

1. **Rate limiting:** Login attempts, password reset requests, invitation creation
2. **Token security:** Secure random generation, single-use, time-limited
3. **Password hashing:** bcrypt with cost factor 12
4. **Session security:** HTTP-only cookies, secure flag in production
5. **RBAC enforcement:** Check role on every API request, not just UI
6. **Audit logging:** Consider logging sensitive actions (login, status changes, invites)
