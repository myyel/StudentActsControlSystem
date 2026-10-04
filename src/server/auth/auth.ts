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
    trustedOrigins: devLanOrigin,
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

const PRIVATE_IPV4 = /^(10\.\d+|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+$/;

/**
 * Dev only: trust the request's own origin when it is a private LAN address, so phones and
 * tablets can sign in to `pnpm dev` at e.g. http://192.168.1.36:3000. Production trusts only BETTER_AUTH_URL.
 */
function devLanOrigin(request?: Request): string[] {
  if (process.env.NODE_ENV !== "development" || !request) return [];
  const origin = request.headers.get("origin");
  if (!origin) return [];
  try {
    return PRIVATE_IPV4.test(new URL(origin).hostname) ? [origin] : [];
  } catch {
    return [];
  }
}

export const auth = createAuth(defaultDb);

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
export type SessionUser = Session["user"];
