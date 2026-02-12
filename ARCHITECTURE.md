# 7Roars Agency OS — Architecture & Build Plan

> **Version:** 3.0 | **Last Updated:** Feb 11, 2026
> **Owner:** Umair Shafiq, CEO @ 7Roars Digital Agency
> **Built By:** Claude Code (autonomous vibe coding)

---

## SECTION A: VISION & ARCHITECTURE

### A1. What This Is

**7Roars Agency OS** — a modular, self-hosted agency management platform. Starting as a time tracker + screenshot tool, architected from day one to grow into a full agency operating system: project management, task boards, client invoicing, team management, reporting, and more.

This is NOT a quick hack. This is a properly architected system where every module plugs into a shared core. When Umair says "add invoicing" 6 months from now, Claude Code should be able to add it in a day — not rewrite the app.

### A2. Architecture Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                        7ROARS AGENCY OS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Module:  │ │  Module:  │ │  Module:  │ │  Module:  │         │
│  │  Time &   │ │  Project  │ │ Invoicing │ │ Clients  │  ...    │
│  │ Activity  │ │  & Tasks  │ │ & Billing │ │ & CRM    │         │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘      │
│        │              │              │              │            │
│  ══════╪══════════════╪══════════════╪══════════════╪═══════    │
│        │         SHARED CORE LAYER                  │            │
│        │                                            │            │
│  ┌─────┴────────────────────────────────────────────┴─────┐     │
│  │  Auth (Better Auth)  │  Database (Prisma + PG)         │     │
│  │  File Storage (R2)   │  Real-time (Socket.io)          │     │
│  │  Notifications       │  Audit Log                      │     │
│  │  RBAC / Permissions  │  API Response Layer              │    │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              DESKTOP AGENT (Electron 40)               │     │
│  │  Timer │ Screenshots │ Activity │ Offline Sync         │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key principle: Every feature is a MODULE that connects to the SHARED CORE.**

When you add "invoicing" later, you:
1. Create a new Prisma schema file in `prisma/modules/invoicing.prisma`
2. Create a new route group `app/(dashboard)/invoicing/`
3. Create module components in `components/modules/invoicing/`
4. Register the module in `lib/modules/registry.ts`
5. Add sidebar nav item in `config/navigation.ts`

That's it. No rewiring. No refactoring. The core handles auth, permissions, layout, and API patterns.

### A3. Module Roadmap

| Phase | Module | Status | Priority |
|---|---|---|---|
| **MVP** | 🕐 Time Tracking & Screenshots | 🔨 Building | P0 |
| **MVP** | 👤 Team Management | 🔨 Building | P0 |
| **MVP** | 📊 Dashboard & Reports | 🔨 Building | P0 |
| **v1.1** | 📋 Project Management | ⏳ Planned | P1 |
| **v1.1** | ✅ Task Management (Kanban) | ⏳ Planned | P1 |
| **v1.2** | 💰 Invoicing & Billing | ⏳ Planned | P2 |
| **v1.2** | 🤝 Client Portal / CRM | ⏳ Planned | P2 |
| **v1.3** | 📈 Advanced Analytics | ⏳ Planned | P3 |
| **v1.3** | 💬 Slack/Discord Integration | ⏳ Planned | P3 |
| **v2.0** | 🧠 AI Productivity Reports | ⏳ Planned | P3 |
| **v2.0** | 📱 Mobile App (Expo) | ⏳ Planned | P3 |

---

## SECTION B: TECH STACK (Verified Feb 2026)

| Component | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 16.1.x | App Router. `proxy.ts` NOT `middleware.ts`. |
| ORM | Prisma | 7.x | Pure TS (no Rust engine). Multi-file schema support. |
| Database | PostgreSQL | 17 | Via Docker or managed. |
| Auth | Better Auth | latest | Successor to NextAuth/Auth.js. RBAC + email/pwd built-in. |
| UI | Tailwind CSS v4 + shadcn/ui | latest | CSS-first config. No `tailwind.config.js`. |
| Real-time | Socket.io | 4.x | Online/offline status, live updates. |
| File Storage | Cloudflare R2 | — | S3-compatible. Free egress. |
| Desktop Agent | Electron | 40.x | `desktopCapturer` for screenshots. |
| Desktop Build | Electron Forge | 7.x | Official build tool. NOT electron-builder. |
| Activity Track | uiohook-napi | 1.5.x | NOT `iohook` (abandoned). |
| Validation | Zod | latest | All inputs validated. |
| Monorepo | Turborepo | latest | Shared types between web + desktop. |
| Deployment | Docker Compose + Hetzner VPS | — | ~$5-10/month total. |

### ❌ DO NOT USE (Deprecated / Outdated)
- `NextAuth.js` / `Auth.js` → merged into Better Auth
- `iohook` → abandoned, use `uiohook-napi`
- `electron-builder` → use Electron Forge
- `middleware.ts` → renamed to `proxy.ts` in Next.js 16
- `tailwind.config.js` → Tailwind v4 uses CSS-first config
- Next.js 14/15 patterns → use v16 patterns

---

## SECTION C: DATABASE ARCHITECTURE (Extensible Schema)

### C1. Schema Design Rules

1. **Multi-file Prisma schema** — Each module gets its own schema file under `prisma/modules/`. Prisma 7 supports this natively.
2. **Every table has:** `id` (cuid), `created_at`, `updated_at`, `deleted_at` (soft delete).
3. **All relations go through `user_id`** — the user table is the hub.
4. **Audit log on all mutations** — `audit_logs` table tracks who did what.
5. **Tenant-ready** — `organization_id` on all tables from day one (even if we only have one org now). Makes multi-tenant easy later.

### C2. Core Schema (`prisma/modules/core.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  logo_url   String?
  settings   Json     @default("{}")
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  members    Member[]
  projects   Project[]
  clients    Client[]
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  avatar_url    String?
  timezone      String   @default("Asia/Karachi")
  is_active     Boolean  @default(true)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  members       Member[]
  time_entries  TimeEntry[]
  screenshots   Screenshot[]
  activity_logs ActivityLog[]
  audit_logs    AuditLog[]
}

model Member {
  id              String       @id @default(cuid())
  user_id         String
  organization_id String
  role            MemberRole   @default(EMPLOYEE)
  hourly_rate     Decimal?     @db.Decimal(10, 2)
  is_active       Boolean      @default(true)
  joined_at       DateTime     @default(now())

  user            User         @relation(fields: [user_id], references: [id])
  organization    Organization @relation(fields: [organization_id], references: [id])

  @@unique([user_id, organization_id])
}

enum MemberRole {
  OWNER
  ADMIN
  MANAGER
  EMPLOYEE
}

model AuditLog {
  id          String   @id @default(cuid())
  user_id     String
  action      String   // CREATE, UPDATE, DELETE
  entity_type String   // "project", "time_entry", etc.
  entity_id   String
  old_data    Json?
  new_data    Json?
  ip_address  String?
  created_at  DateTime @default(now())

  user        User     @relation(fields: [user_id], references: [id])
}

model Setting {
  id              String @id @default(cuid())
  organization_id String
  key             String
  value           Json
  
  @@unique([organization_id, key])
}
```

### C3. Time & Activity Module (`prisma/modules/time-tracking.prisma`)

```prisma
model Project {
  id              String       @id @default(cuid())
  organization_id String
  name            String
  color           String       @default("#6366f1")
  description     String?
  client_id       String?
  is_billable     Boolean      @default(true)
  hourly_rate     Decimal?     @db.Decimal(10, 2)
  budget_hours    Decimal?     @db.Decimal(10, 2)
  status          ProjectStatus @default(ACTIVE)
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt
  deleted_at      DateTime?

  organization    Organization @relation(fields: [organization_id], references: [id])
  client          Client?      @relation(fields: [client_id], references: [id])
  time_entries    TimeEntry[]
  tasks           Task[]
}

enum ProjectStatus {
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

model TimeEntry {
  id           String    @id @default(cuid())
  user_id      String
  project_id   String?
  task_id      String?
  description  String?
  start_time   DateTime
  end_time     DateTime?
  duration     Int?      // seconds
  is_manual    Boolean   @default(false)
  is_billable  Boolean   @default(true)
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt

  user         User      @relation(fields: [user_id], references: [id])
  project      Project?  @relation(fields: [project_id], references: [id])
  task         Task?     @relation(fields: [task_id], references: [id])
  screenshots  Screenshot[]
  activities   ActivityLog[]
}

model Screenshot {
  id             String   @id @default(cuid())
  user_id        String
  time_entry_id  String?
  image_url      String
  thumbnail_url  String
  activity_level Int      @default(0) // 0-100
  is_blurred     Boolean  @default(false)
  captured_at    DateTime @default(now())
  created_at     DateTime @default(now())

  user           User      @relation(fields: [user_id], references: [id])
  time_entry     TimeEntry? @relation(fields: [time_entry_id], references: [id])
}

model ActivityLog {
  id                String   @id @default(cuid())
  user_id           String
  time_entry_id     String?
  interval_start    DateTime
  interval_end      DateTime
  keyboard_count    Int      @default(0)
  mouse_count       Int      @default(0)
  activity_percent  Int      @default(0) // 0-100
  created_at        DateTime @default(now())

  user              User      @relation(fields: [user_id], references: [id])
  time_entry        TimeEntry? @relation(fields: [time_entry_id], references: [id])
}
```

### C4. Future Module Schemas (Pre-Designed — DO NOT BUILD YET)

These schemas exist so the MVP doesn't accidentally block future features.

```prisma
// prisma/modules/clients.prisma — BUILD IN v1.2
model Client {
  id              String   @id @default(cuid())
  organization_id String
  name            String
  email           String?
  phone           String?
  company         String?
  address         Json?
  notes           String?
  status          ClientStatus @default(ACTIVE)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  deleted_at      DateTime?

  organization    Organization @relation(fields: [organization_id], references: [id])
  projects        Project[]
  invoices        Invoice[]
}

enum ClientStatus {
  LEAD
  ACTIVE
  PAUSED
  CHURNED
}

// prisma/modules/tasks.prisma — BUILD IN v1.1
model Task {
  id           String     @id @default(cuid())
  project_id   String
  assignee_id  String?
  title        String
  description  String?
  status       TaskStatus @default(TODO)
  priority     TaskPriority @default(MEDIUM)
  due_date     DateTime?
  estimated_hours Decimal? @db.Decimal(10, 2)
  sort_order   Int        @default(0)
  created_at   DateTime   @default(now())
  updated_at   DateTime   @updatedAt
  deleted_at   DateTime?

  project      Project    @relation(fields: [project_id], references: [id])
  time_entries TimeEntry[]
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
  BLOCKED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// prisma/modules/invoicing.prisma — BUILD IN v1.2
model Invoice {
  id              String        @id @default(cuid())
  organization_id String
  client_id       String
  invoice_number  String        @unique
  status          InvoiceStatus @default(DRAFT)
  issue_date      DateTime
  due_date        DateTime
  subtotal        Decimal       @db.Decimal(10, 2)
  tax_rate        Decimal       @default(0) @db.Decimal(5, 2)
  tax_amount      Decimal       @default(0) @db.Decimal(10, 2)
  total           Decimal       @db.Decimal(10, 2)
  currency        String        @default("USD")
  notes           String?
  paid_at         DateTime?
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  client          Client        @relation(fields: [client_id], references: [id])
  line_items      InvoiceLineItem[]
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  OVERDUE
  CANCELLED
}

model InvoiceLineItem {
  id          String  @id @default(cuid())
  invoice_id  String
  description String
  quantity    Decimal @db.Decimal(10, 2)
  unit_price  Decimal @db.Decimal(10, 2)
  amount      Decimal @db.Decimal(10, 2)

  invoice     Invoice @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
}
```

---

## SECTION D: FOLDER STRUCTURE (Module-Based)

```
7roars-os/
│
├── apps/
│   ├── web/                              # Next.js 16 Dashboard
│   │   ├── app/
│   │   │   ├── (auth)/                   # Public auth pages
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/              # Protected dashboard
│   │   │   │   ├── layout.tsx            # Sidebar + topbar wrapper
│   │   │   │   ├── page.tsx              # Dashboard home
│   │   │   │   ├── timesheets/           # Module: Time Tracking
│   │   │   │   ├── screenshots/          # Module: Screenshots
│   │   │   │   ├── team/                 # Module: Team Management
│   │   │   │   ├── projects/             # Module: Projects (v1.1)
│   │   │   │   ├── tasks/               # Module: Tasks (v1.1)
│   │   │   │   ├── clients/             # Module: Clients (v1.2)
│   │   │   │   ├── invoices/            # Module: Invoicing (v1.2)
│   │   │   │   ├── reports/             # Module: Reports
│   │   │   │   └── settings/            # Org + user settings
│   │   │   ├── api/
│   │   │   │   ├── auth/[...all]/route.ts  # Better Auth handler
│   │   │   │   ├── trpc/[trpc]/route.ts    # Optional: tRPC if needed
│   │   │   │   └── v1/                     # REST API for desktop agent
│   │   │   │       ├── time-entries/
│   │   │   │       ├── screenshots/
│   │   │   │       └── activity/
│   │   │   └── proxy.ts                 # Next.js 16 proxy (NOT middleware.ts)
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                      # shadcn/ui primitives
│   │   │   ├── layout/                  # Sidebar, Topbar, Breadcrumbs
│   │   │   ├── shared/                  # DataTable, DatePicker, Charts
│   │   │   └── modules/                 # Module-specific components
│   │   │       ├── time-tracking/
│   │   │       ├── screenshots/
│   │   │       ├── team/
│   │   │       ├── projects/            # (v1.1)
│   │   │       ├── tasks/               # (v1.1)
│   │   │       ├── clients/             # (v1.2)
│   │   │       └── invoices/            # (v1.2)
│   │   │
│   │   ├── lib/
│   │   │   ├── auth.ts                  # Better Auth server config
│   │   │   ├── auth-client.ts           # Better Auth client
│   │   │   ├── db.ts                    # Prisma client singleton
│   │   │   ├── storage.ts              # R2/S3 upload helpers
│   │   │   ├── api-response.ts          # Standardized API responses
│   │   │   ├── permissions.ts           # RBAC helper functions
│   │   │   ├── audit.ts                # Audit log helper
│   │   │   └── utils.ts
│   │   │
│   │   ├── config/
│   │   │   ├── navigation.ts            # Sidebar nav items (add modules here)
│   │   │   ├── modules.ts              # Module registry (enabled/disabled)
│   │   │   └── constants.ts
│   │   │
│   │   ├── hooks/                       # Shared React hooks
│   │   │   ├── use-session.ts
│   │   │   ├── use-permissions.ts
│   │   │   └── use-realtime.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # Main schema (imports modules)
│   │   │   └── modules/
│   │   │       ├── core.prisma
│   │   │       ├── time-tracking.prisma
│   │   │       ├── clients.prisma       # (v1.2 — schema ready, not migrated)
│   │   │       ├── tasks.prisma         # (v1.1 — schema ready, not migrated)
│   │   │       └── invoicing.prisma     # (v1.2 — schema ready, not migrated)
│   │   │
│   │   └── actions/                     # Server actions per module
│   │       ├── time-entries.ts
│   │       ├── screenshots.ts
│   │       ├── projects.ts
│   │       ├── team.ts
│   │       └── settings.ts
│   │
│   └── desktop/                          # Electron 40 Agent
│       ├── src/
│       │   ├── main/
│       │   │   ├── index.ts             # Main process entry
│       │   │   ├── tray.ts              # System tray
│       │   │   ├── screenshot.ts        # desktopCapturer
│       │   │   ├── activity.ts          # uiohook-napi listener
│       │   │   ├── sync.ts             # API sync + offline queue
│       │   │   └── store.ts            # better-sqlite3 local store
│       │   ├── renderer/
│       │   │   ├── App.tsx
│       │   │   ├── Timer.tsx
│       │   │   └── Settings.tsx
│       │   └── shared/
│       │       └── types.ts
│       ├── forge.config.ts
│       └── package.json
│
├── packages/
│   └── shared/                           # Shared between web + desktop
│       ├── types/
│       │   ├── api.ts                   # API request/response types
│       │   ├── models.ts               # Shared model types
│       │   └── index.ts
│       └── constants/
│           └── index.ts
│
├── docker-compose.yml                    # PostgreSQL + Redis + App
├── Dockerfile
├── turbo.json                           # Turborepo config
├── CONTEXT.md                           # ⭐ Claude Code reads this FIRST
├── CHANGELOG.md                         # ⭐ Claude Code updates after EVERY session
├── ARCHITECTURE.md                      # This file (you're reading it)
└── README.md
```

---

## SECTION E: SHARED CORE PATTERNS

### E1. Module Registry (`config/modules.ts`)

Every new module registers here. The sidebar, permissions, and routing all read from this.

```typescript
export interface Module {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  href: string;
  enabled: boolean;
  requiredRole: MemberRole[];
  version: string; // when this module was added
}

export const modules: Module[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: "LayoutDashboard",
    href: "/",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.0",
  },
  {
    id: "timesheets",
    name: "Timesheets",
    icon: "Clock",
    href: "/timesheets",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.0",
  },
  {
    id: "screenshots",
    name: "Screenshots",
    icon: "Camera",
    href: "/screenshots",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.0",
  },
  {
    id: "team",
    name: "Team",
    icon: "Users",
    href: "/team",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.0",
  },
  {
    id: "projects",
    name: "Projects",
    icon: "FolderKanban",
    href: "/projects",
    enabled: false, // enable in v1.1
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.1",
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: "CheckSquare",
    href: "/tasks",
    enabled: false, // enable in v1.1
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.1",
  },
  {
    id: "clients",
    name: "Clients",
    icon: "Building2",
    href: "/clients",
    enabled: false, // enable in v1.2
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.2",
  },
  {
    id: "invoices",
    name: "Invoices",
    icon: "Receipt",
    href: "/invoices",
    enabled: false, // enable in v1.2
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.2",
  },
  {
    id: "reports",
    name: "Reports",
    icon: "BarChart3",
    href: "/reports",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.0",
  },
  {
    id: "settings",
    name: "Settings",
    icon: "Settings",
    href: "/settings",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.0",
  },
];
```

### E2. Standardized API Response (`lib/api-response.ts`)

```typescript
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};

export function ok<T>(data: T, meta?: ApiResponse["meta"]): ApiResponse<T> {
  return { success: true, data, meta };
}

export function err(error: string, status = 400): ApiResponse {
  return { success: false, error };
}
```

### E3. Audit Log Helper (`lib/audit.ts`)

```typescript
export async function auditLog(params: {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  ip?: string;
}) {
  await db.auditLog.create({ data: params });
}
```

### E4. Permission Check (`lib/permissions.ts`)

```typescript
export function canAccess(userRole: MemberRole, requiredRoles: MemberRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export function requireRole(...roles: MemberRole[]) {
  // Use as server action guard
  return async () => {
    const session = await auth();
    if (!session) throw new Error("Unauthorized");
    const member = await getMember(session.user.id);
    if (!canAccess(member.role, roles)) throw new Error("Forbidden");
    return { session, member };
  };
}
```

---

## SECTION F: BUILD PHASES (Detailed)

### Phase 1: Foundation + Core (Week 1)

**Goal:** Working auth, database, layout shell, and core infrastructure that all future modules depend on.

| # | Task | Files Created | Test |
|---|---|---|---|
| 1.1 | Init Turborepo monorepo with `apps/web` + `packages/shared` | `turbo.json`, root `package.json` | `turbo build` succeeds |
| 1.2 | Create Next.js 16 app in `apps/web` | All Next.js boilerplate | `npm run dev` loads |
| 1.3 | Set up Prisma 7 with multi-file schema | `prisma/schema.prisma`, `prisma/modules/core.prisma` | `npx prisma db push` succeeds |
| 1.4 | Set up Better Auth (email/password + roles) | `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts` | Can register + login |
| 1.5 | Create core DB schema + migrate | `prisma/modules/core.prisma` (Organization, User, Member, AuditLog, Setting) | Tables exist in PG |
| 1.6 | Create time-tracking schema + migrate | `prisma/modules/time-tracking.prisma` | Tables exist in PG |
| 1.7 | Build dashboard layout shell | `app/(dashboard)/layout.tsx` — sidebar + topbar | Layout renders with nav |
| 1.8 | Build module registry + dynamic sidebar | `config/modules.ts`, `config/navigation.ts` | Sidebar shows enabled modules |
| 1.9 | Build shared helpers | `lib/api-response.ts`, `lib/audit.ts`, `lib/permissions.ts`, `lib/db.ts`, `lib/storage.ts` | Helpers importable |
| 1.10 | Set up Docker Compose (PG + app) | `docker-compose.yml`, `Dockerfile` | `docker compose up` works |
| 1.11 | Create CHANGELOG.md + update CONTEXT.md | `CHANGELOG.md` | Files exist and are accurate |

**Claude Code prompt for Phase 1:**
```
Read CONTEXT.md and ARCHITECTURE.md first.
Build Phase 1 tasks 1.1 through 1.11 in order.
After each task, update CHANGELOG.md with what was done.
After all tasks, update CONTEXT.md "Current Status" section.
Test each task works before moving to the next.
```

### Phase 2: Time Tracking + Screenshot MVP (Week 2)

**Goal:** Working timesheet view, screenshot gallery, REST API for desktop agent.

| # | Task | Files Created | Test |
|---|---|---|---|
| 2.1 | Build REST API: `POST /api/v1/time-entries` (start/stop/create) | `app/api/v1/time-entries/route.ts` | cURL test works |
| 2.2 | Build REST API: `POST /api/v1/screenshots` (upload) | `app/api/v1/screenshots/route.ts`, R2 upload in `lib/storage.ts` | Upload returns URL |
| 2.3 | Build REST API: `POST /api/v1/activity` (log activity) | `app/api/v1/activity/route.ts` | cURL test works |
| 2.4 | Build Timesheet page (table with daily/weekly toggle) | `app/(dashboard)/timesheets/page.tsx`, `components/modules/time-tracking/` | Page renders with data |
| 2.5 | Build Screenshot Gallery (grid, lightbox, filters) | `app/(dashboard)/screenshots/page.tsx`, `components/modules/screenshots/` | Gallery shows images |
| 2.6 | Build Team page (employee list, online status) | `app/(dashboard)/team/page.tsx`, `components/modules/team/` | Team list renders |
| 2.7 | Build Dashboard home (summary cards, charts) | `app/(dashboard)/page.tsx` | Shows today's data |
| 2.8 | Build Settings page (org settings, screenshot freq) | `app/(dashboard)/settings/page.tsx` | Can save settings |
| 2.9 | Build Reports page (export CSV/PDF) | `app/(dashboard)/reports/page.tsx` | Download works |
| 2.10 | Add Socket.io for real-time status | `lib/socket.ts`, client hooks | Live status updates |
| 2.11 | Update CHANGELOG.md + CONTEXT.md | — | Accurate |

**Claude Code prompt for Phase 2:**
```
Read CONTEXT.md and CHANGELOG.md to understand current state.
Read ARCHITECTURE.md Section E for shared patterns.
Build Phase 2 tasks. For each page:
1. Create the server action in actions/
2. Create the page in app/(dashboard)/
3. Create components in components/modules/
4. Follow the api-response.ts pattern for all API routes
5. Add audit logging for all mutations
6. Update CHANGELOG.md after each task
```

### Phase 3: Desktop Agent (Week 3)

| # | Task | Files Created | Test |
|---|---|---|---|
| 3.1 | Init Electron 40 + Forge + React in `apps/desktop` | Electron boilerplate | `npm start` opens window |
| 3.2 | System tray with start/stop timer | `src/main/tray.ts` | Tray icon works |
| 3.3 | Timer UI with project selector | `src/renderer/Timer.tsx` | Timer counts up |
| 3.4 | Screenshot capture via `desktopCapturer` | `src/main/screenshot.ts` | Screenshot saves locally |
| 3.5 | Random interval screenshot (5-10 min) | Integrate into timer flow | Screenshots auto-capture |
| 3.6 | Compress to WebP via `sharp` | In screenshot.ts | File size <100KB |
| 3.7 | Activity tracking via `uiohook-napi` | `src/main/activity.ts` | Logs keyboard/mouse counts |
| 3.8 | API sync — upload time entries + screenshots | `src/main/sync.ts` | Data appears in dashboard |
| 3.9 | Offline queue via `better-sqlite3` | `src/main/store.ts` | Queues when offline, syncs when back |
| 3.10 | Auth flow — login screen in agent | `src/renderer/Login.tsx` | Agent authenticates |
| 3.11 | Build Windows installer via Forge | `forge.config.ts` | `.exe` installs and runs |
| 3.12 | Update CHANGELOG.md + CONTEXT.md | — | Accurate |

### Phase 4: Polish + Deploy (Week 4)

| # | Task |
|---|---|
| 4.1 | End-to-end testing: agent → API → dashboard |
| 4.2 | Error handling + loading states across all pages |
| 4.3 | Responsive design for dashboard (tablet-friendly) |
| 4.4 | Deploy to Hetzner VPS via Docker Compose |
| 4.5 | Set up Nginx + SSL (Let's Encrypt) |
| 4.6 | Configure Cloudflare R2 bucket |
| 4.7 | Set up auto-delete for old screenshots (cron job) |
| 4.8 | Desktop agent auto-update via Forge |
| 4.9 | Seed data for demo/testing |
| 4.10 | Final CHANGELOG.md + CONTEXT.md update |

---

## SECTION G: CLAUDE CODE OPERATING INSTRUCTIONS

### G1. First-Time Setup

When starting a brand new session, Claude Code MUST do this:

```
1. Read CONTEXT.md (current project state)
2. Read the LAST 20 lines of CHANGELOG.md (what was done recently)
3. Read ARCHITECTURE.md Section F to find current phase
4. Identify the NEXT uncompleted task
5. Build that task
6. Update CHANGELOG.md
7. Update CONTEXT.md if a phase milestone was hit
```

### G2. CONTEXT.md (Claude Code Reads This First Every Session)

```markdown
# 7Roars Agency OS — Context File

> ⚡ CLAUDE CODE: Read this file FIRST at the start of every session.
> Then read the last 20 lines of CHANGELOG.md for recent progress.

## Project Summary
Internal agency management platform for 7Roars Digital Agency (13-member team).
Starting as time tracker + screenshots, designed to grow into full agency OS.

## Tech Stack — USE THESE EXACT VERSIONS
- Next.js 16.1 (App Router) — use proxy.ts NOT middleware.ts
- Prisma 7 (multi-file schema) + PostgreSQL 17
- Better Auth (NOT NextAuth — it's merged into Better Auth now)
- Tailwind CSS v4 (CSS-first config, NO tailwind.config.js)
- shadcn/ui for components
- Electron 40 + Electron Forge (NOT electron-builder)
- uiohook-napi (NOT iohook — it's abandoned)
- Socket.io v4
- Cloudflare R2 (S3-compatible)
- Turborepo monorepo
- Zod for validation
- TypeScript everywhere

## ❌ DO NOT USE (Deprecated)
- NextAuth.js / Auth.js → Better Auth
- iohook → uiohook-napi
- electron-builder → Electron Forge
- middleware.ts → proxy.ts (Next.js 16)
- tailwind.config.js → CSS-first in Tailwind v4
- Any Next.js 14/15 patterns

## Code Conventions
- Multi-file Prisma schema: `prisma/modules/*.prisma`
- All tables have: id (cuid), created_at, updated_at
- All tables have organization_id for multi-tenant readiness
- Soft delete via deleted_at (nullable DateTime)
- API responses: use lib/api-response.ts → { success, data?, error?, meta? }
- Audit logging on ALL mutations via lib/audit.ts
- Permission checks via lib/permissions.ts
- Module-based folder structure: components/modules/<module-name>/
- New features register in config/modules.ts
- Server actions in actions/<module>.ts
- REST API for desktop agent: app/api/v1/

## Adding a New Module (FOLLOW THIS PATTERN)
1. Create schema: prisma/modules/<module>.prisma
2. Run migration: npx prisma db push
3. Create route group: app/(dashboard)/<module>/page.tsx
4. Create components: components/modules/<module>/
5. Create server actions: actions/<module>.ts
6. Register in config/modules.ts (set enabled: true)
7. Add nav item in config/navigation.ts
8. Update CHANGELOG.md

## Current Status
- [x] Phase 1: Foundation + Core ✅
- [ ] Phase 2: Time Tracking + Screenshot MVP 🔨 IN PROGRESS
  - [x] 2.1 Time entries API
  - [x] 2.2 Screenshots API
  - [ ] 2.3 Activity API ← NEXT TASK
  - [ ] 2.4-2.11 remaining
- [ ] Phase 3: Desktop Agent
- [ ] Phase 4: Deploy

## Known Issues / Blockers
- None currently

## Environment
- Node: 22.x
- Package Manager: pnpm (preferred) or npm
- OS: Windows (primary), Mac (secondary)
- DB: PostgreSQL 17 via Docker
```

### G3. CHANGELOG.md Format

Claude Code MUST update this after every task. This is the project's memory.

```markdown
# 7Roars Agency OS — Changelog

> This file is the project's memory. Claude Code updates it after every task.
> Read the last 20-30 lines to understand recent progress.

## Format
Each entry: `[DATE] [PHASE.TASK] STATUS — Description`
Status: ✅ DONE | ⚠️ PARTIAL | ❌ FAILED | 🔄 REVERTED

---

## Session Log

### 2026-02-12 — Session 1

[2026-02-12] [1.1] ✅ DONE — Initialized Turborepo monorepo
- Created turbo.json, root package.json
- Workspaces: apps/web, apps/desktop, packages/shared
- Verified: `turbo build` succeeds

[2026-02-12] [1.2] ✅ DONE — Created Next.js 16 app in apps/web
- npx create-next-app@latest with TypeScript + Tailwind
- Verified: `npm run dev` loads at localhost:3000

[2026-02-12] [1.3] ⚠️ PARTIAL — Prisma multi-file schema
- Created prisma/schema.prisma and prisma/modules/core.prisma
- Issue: Prisma 7 requires `previewFeatures = ["prismaSchemaFolder"]` — added it
- Verified: `npx prisma db push` succeeds after fix

[2026-02-12] [1.4] ❌ FAILED — Better Auth setup
- Error: `better-auth` npm package requires Node 22+ but current env has Node 20
- BLOCKER: Need to upgrade Node
- Next action: Run `nvm install 22` then retry

### 2026-02-13 — Session 2

[2026-02-13] [1.4] ✅ DONE — Better Auth setup (retry after Node upgrade)
- Upgraded to Node 22.x
- Installed better-auth, configured email/password + RBAC
- Created lib/auth.ts, lib/auth-client.ts, app/api/auth/[...all]/route.ts
- Verified: Can register + login + roles work

---

## Working Features (What's Live)
- [ ] Auth (login/register)
- [ ] Dashboard layout shell
- [ ] Timesheet page
- [ ] Screenshot gallery
- [ ] Desktop agent
- [ ] Real-time status

## Bottlenecks & Tech Debt
- None currently

## Reverted Decisions
- None currently
```

### G4. Rules for Claude Code

```
RULES YOU MUST FOLLOW:

1. READ FIRST, CODE SECOND
   - Always read CONTEXT.md + last 20 lines of CHANGELOG.md before doing anything
   - If either file doesn't exist, CREATE them from the templates in ARCHITECTURE.md

2. ONE TASK AT A TIME
   - Complete task N before starting task N+1
   - Test each task works before marking it done

3. UPDATE CHANGELOG AFTER EVERY TASK
   - Use the exact format from Section G3
   - Include: what files were created/modified, what was tested, any issues

4. UPDATE CONTEXT.md WHEN
   - A phase is completed
   - A blocker is discovered
   - A decision is reverted
   - Current task pointer changes

5. FOLLOW THE MODULE PATTERN
   - All new features follow Section E patterns
   - Register in modules.ts
   - Use api-response.ts for all API endpoints
   - Add audit logging for all mutations
   - Check permissions for all protected routes

6. ERROR HANDLING
   - Never silently fail — log errors, show user-friendly messages
   - Wrap all async operations in try/catch
   - Use Zod for all input validation

7. WHEN YOU HIT A BLOCKER
   - Log it in CHANGELOG.md with ❌ FAILED and description
   - Log it in CONTEXT.md under "Known Issues / Blockers"
   - Try an alternative approach if obvious
   - If stuck, explain the issue clearly for the next session

8. NEVER DO THESE
   - Never delete CHANGELOG.md or CONTEXT.md
   - Never use deprecated packages (see "DO NOT USE" list)
   - Never hardcode secrets — use .env
   - Never skip audit logging
   - Never create a page without checking permissions
   - Never modify the shared core patterns without updating ARCHITECTURE.md
```

### G5. How to Resume After Context Window Loss

If Claude Code starts a new session and the context window is fresh:

```
RECOVERY STEPS:
1. cat CONTEXT.md — understand project state
2. tail -50 CHANGELOG.md — see what was done recently  
3. Check "Current Status" in CONTEXT.md for the NEXT task
4. Check "Known Issues / Blockers" for anything unresolved
5. Check "Working Features" list to know what's live
6. ls the folder structure to verify what exists
7. Resume from the next uncompleted task
```

---

## SECTION H: ADDING MODULES LATER (Playbook)

### Example: Adding "Invoicing" Module

When Umair says "add invoicing", Claude Code should:

```
1. Read ARCHITECTURE.md Section C4 — schema already designed
2. Enable the invoicing schema:
   - Copy prisma/modules/invoicing.prisma to active
   - Run npx prisma db push
3. Create the pages:
   - app/(dashboard)/invoices/page.tsx (list view)
   - app/(dashboard)/invoices/[id]/page.tsx (detail view)
   - app/(dashboard)/invoices/new/page.tsx (create form)
4. Create components:
   - components/modules/invoices/InvoiceTable.tsx
   - components/modules/invoices/InvoiceForm.tsx
   - components/modules/invoices/InvoicePDF.tsx
5. Create server actions:
   - actions/invoices.ts (CRUD + send + mark paid)
6. Register module:
   - In config/modules.ts, set invoices.enabled = true
7. Update CHANGELOG.md
8. Update CONTEXT.md
```

Time estimate: **4-8 hours** of vibe coding.

### Example: Adding "Task Management" Module

```
1. Enable prisma/modules/tasks.prisma → db push
2. Create app/(dashboard)/tasks/page.tsx (Kanban board)
3. Create components/modules/tasks/KanbanBoard.tsx
4. Create actions/tasks.ts (CRUD + status change + assign)
5. Link tasks to projects (already has project_id in schema)
6. Link tasks to time_entries (already has task_id in schema)
7. Register in modules.ts
8. Update changelog
```

### Example: Adding "Client Portal"

```
1. Enable prisma/modules/clients.prisma → db push
2. Create app/(dashboard)/clients/page.tsx
3. Create a new route group: app/(portal)/ for client-facing views
4. Clients can view: their projects, timesheets, invoices
5. Separate auth flow for clients (viewer role in Better Auth)
6. Register in modules.ts
7. Update changelog
```

---

## SECTION I: DEPLOYMENT

### Docker Compose

```yaml
version: "3.8"

services:
  db:
    image: postgres:17-alpine
    restart: always
    environment:
      POSTGRES_DB: agency_os
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"

  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/agency_os
      BETTER_AUTH_SECRET: ${AUTH_SECRET}
      R2_ACCESS_KEY: ${R2_ACCESS_KEY}
      R2_SECRET_KEY: ${R2_SECRET_KEY}
      R2_BUCKET: ${R2_BUCKET}
      R2_ENDPOINT: ${R2_ENDPOINT}
    depends_on:
      - db
      - redis

volumes:
  pgdata:
```

### Cost Breakdown

| Item | Monthly Cost |
|---|---|
| Hetzner CX22 (4GB, 2 vCPU) | ~$5 |
| Cloudflare R2 (first 10GB free) | ~$0-5 |
| Domain (already owned) | $0 |
| **Total** | **~$5-10/month** |
| **vs Worktivity** | **$100/month** |
| **Annual savings** | **~$1,080/year** |

---

## SECTION J: QUICK REFERENCE

### Start Building
```bash
# Clone, install, run
git clone <repo>
pnpm install
docker compose up -d  # Start PostgreSQL
cd apps/web
npx prisma db push    # Create tables
pnpm dev              # Start dashboard at :3000
```

### Add a New Module
```
1. Schema → prisma/modules/<name>.prisma → db push
2. Pages → app/(dashboard)/<name>/
3. Components → components/modules/<name>/
4. Actions → actions/<name>.ts
5. Register → config/modules.ts (enabled: true)
6. Changelog → CHANGELOG.md
```

### File Naming
```
Pages:        page.tsx (Next.js convention)
Components:   PascalCase.tsx (DataTable.tsx, InvoiceForm.tsx)
Actions:      kebab-case.ts (time-entries.ts)
Libs:         kebab-case.ts (api-response.ts)
Schemas:      kebab-case.prisma (time-tracking.prisma)
```

---

**This document is the single source of truth. Claude Code should reference it for all architectural decisions. When in doubt, follow the patterns established here.**
