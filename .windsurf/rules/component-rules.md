---
trigger: glob
globs: ["components/**", "app/**/*.tsx"]
---

# Component Rules

- Use shadcn/ui as the base component library
- Tailwind CSS v4 with CSS-first config (no tailwind.config.js)
- All components are TypeScript (.tsx)
- PascalCase for component files (DataTable.tsx, InvoiceForm.tsx)
- Module components go in components/modules/<module-name>/
- Shared components go in components/shared/
- UI primitives go in components/ui/ (shadcn)
- Use lucide-react for icons
- All data tables should use a shared DataTable component
- Loading states on all async operations
- Error boundaries on all pages