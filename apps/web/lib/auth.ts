import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      timezone: {
        type: "string",
        required: false,
        defaultValue: "Asia/Karachi",
        input: true,
      },
      is_active: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      avatar_url: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            // Check if user already has a membership (avoid duplicates on retry)
            const existingMember = await db.member.findFirst({
              where: { user_id: user.id },
            });
            if (existingMember) return;

            // Create default organization with user's name
            const orgName = `${user.name}'s Organization`;
            const baseSlug = slugify(orgName);
            const slug = `${baseSlug}-${user.id.slice(-6)}`;

            const org = await db.organization.create({
              data: {
                name: orgName,
                slug,
              },
            });

            // First user in org is OWNER
            await db.member.create({
              data: {
                user_id: user.id,
                organization_id: org.id,
                role: "OWNER",
              },
            });
          } catch (error) {
            console.error("[AUTH HOOK] Failed to create org/member after signup:", error);
          }
        },
      },
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;
