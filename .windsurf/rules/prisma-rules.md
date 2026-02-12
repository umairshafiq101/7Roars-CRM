---
trigger: glob
globs: ["prisma/**", "**/*.prisma"]
---

# Prisma Rules

- Use Prisma 7 with multi-file schema support
- Every model MUST have: id (cuid), created_at, updated_at
- Every model MUST have organization_id for multi-tenant readiness
- Use soft delete (deleted_at DateTime?) instead of hard delete
- Use enums for status fields (not strings)
- Use @db.Decimal(10, 2) for money fields
- Relations always defined on both sides
- Schema files go in prisma/modules/<module-name>.prisma