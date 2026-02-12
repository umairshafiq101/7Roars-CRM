---
trigger: glob
globs: ["app/api/**"]
---

# API Rules

- ALL endpoints return: { success: boolean, data?: T, error?: string }
- Use lib/api-response.ts helpers: ok(data) and err(message)
- Validate ALL inputs with Zod schemas
- Check auth on every route (Better Auth session)
- Check role permissions via lib/permissions.ts
- Add audit logging for ALL mutations (CREATE/UPDATE/DELETE)
- REST endpoints for desktop agent: app/api/v1/
- Server actions for dashboard UI: actions/<module>.ts