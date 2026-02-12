---
trigger: always_on
---

# 7Roars Agency OS — Project Rules

You are building an internal agency management platform for 7Roars Digital Agency (13-member team in Lahore, Pakistan). This is a modular system starting with time tracking + screenshots, designed to grow into full agency OS.

## CRITICAL: Read These Files First

Before writing ANY code, read these files in order:
1. `CONTEXT.md` — Current project state, what's done, what's next
2. `CHANGELOG.md` — Last 30 lines for recent progress
3. `ARCHITECTURE.md` — Full system design, patterns, schemas

If `CONTEXT.md` or `CHANGELOG.md` don't exist yet, create them using the templates in `ARCHITECTURE.md` Sections G2 and G3.

## Tech Stack — USE THESE EXACT VERSIONS

- Next.js 16 (App Router) — use `proxy.ts` NOT `middleware.ts`
- Prisma 7 (multi-file schema) + PostgreSQL 17
- Better Auth (NOT NextAuth — it's been merged into Better Auth)
- Tailwind CSS v4 (CSS-first config, NO `tailwind.config.js`)
- shadcn/ui for components
- Electron 40 + Electron Forge 7 (NOT electron-builder)
- uiohook-napi (NOT iohook — it's abandoned)
- Socket.io v4
- Cloudflare R2 (S3-compatible for file storage)
- Turborepo for monorepo
- Zod for ALL input validation
- TypeScript everywhere — no plain JS

## NEVER USE THESE (Deprecated/Abandoned)

- ❌ NextAuth.js / Auth.js → Use Better Auth
- ❌ iohook → Use uiohook-napi
- ❌ electron-builder → Use Electron Forge
- ❌ middleware.ts → renamed to proxy.ts in Next.js 16
- ❌ tailwind.config.js → Tailwind v4 uses CSS-first config
- ❌ Any Next.js 14 or 15 patterns

## Code Conventions

- All tables: id (cuid), created_at, updated_at, organization_id
- Soft delete via deleted_at (nullable DateTime)
- Multi-file Prisma schema: `prisma/modules/*.prisma`
- API responses: `{ success: boolean, data?: T, error?: string, meta?: {...} }`
- Audit log ALL mutations via `lib/audit.ts`
- Check permissions on ALL protected routes via `lib/permissions.ts`
- Server actions in `actions/<module>.ts`
- REST API for desktop agent only: `app/api/v1/`
- Module components in `components/modules/<module-name>/`
- Register new features in `config/modules.ts`

## After Every Task

1. Update `CHANGELOG.md` with: date, task ID, status (✅/⚠️/❌), description, files changed
2. Update `CONTEXT.md` "Current Status" section if a milestone was hit
3. Log any blockers in `CONTEXT.md` under "Known Issues"

## Adding New Modules Pattern

1. Schema → `prisma/modules/<name>.prisma` → `npx prisma db push`
2. Pages → `app/(dashboard)/<name>/`
3. Components → `components/modules/<name>/`
4. Actions → `actions/<name>.ts`
5. Register → `config/modules.ts` (set enabled: true)
6. Update CHANGELOG.md