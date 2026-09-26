import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db as defaultDb, type Db } from "@/server/db";
import { account, rateLimit, session, user, verification } from "@/server/db/schema";

type CreateAuthOptions = {
  /** Next.js cookie plugin; off in tests where there is no request scope. */
  nextjs?: boolean;
  rateLimitEnabled?: boolean;
};

export function createAuth(db: Db, { nextjs = true, rateLimitEnabled }: CreateAuthOptions = {}) {
  const plugins: BetterAuthPlugin[] = nextjs ? [nextCookies()] : [];

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification, rateLimit },
    }),
    emailAndPassword: {
      enabled: true,
      // No open registration: parents join via invite codes (phase 2), admins create teachers.
      disableSignUp: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {
        role: {
          type: ["admin", "teacher", "parent"],
          required: true,
          defaultValue: "parent",
          input: false,
        },
        schoolId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    advanced: {
      database: { generateId: "uuid" },
    },
    rateLimit: {
      // Better Auth defaults to production-only; tests turn it on explicitly.
      enabled: rateLimitEnabled,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
    },
    plugins,
  });
}

export const auth = createAuth(defaultDb);

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
export type SessionUser = Session["user"];
