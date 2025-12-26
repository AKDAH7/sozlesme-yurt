export const TECH_STACK = {
  database: {
    name: "PostgreSQL",
    client: "pg",
    orm: "none",
    notes: "Do not use Prisma.",
  },
  backend: {
    language: "TypeScript",
    framework: "Next.js App Router",
  },
  auth: {
    style: "simple_login",
    passwordHashing: "bcrypt",
    session: "cookie-based",
  },
  frontend: {
    forms: "react-hook-form",
    ui: "shadcn/ui",
  },
  testing: {
    e2e: "@playwright/test",
  },
  documents: {
    qrcode: "qrcode",
  },
  formatting: {
    dateFormat: "DD.MM.YYYY",
  },
  constraints: {
    mustStoreDataInDatabase: true,
    allowedLibrariesOnly: true,
  },
} as const;

export type TechStack = typeof TECH_STACK;
