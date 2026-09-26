import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import { user } from "@/server/db/schema";
import { createAuth, type Auth } from "@/server/auth/auth";
import { createCredentialUser } from "@/server/auth/users";
import { createTestDb } from "../helpers/db";

const PASSWORD = "Sifre1234!";
const BASE_URL = "http://localhost:3000";

let db: Db;
let auth: Auth;

beforeAll(async () => {
  db = await createTestDb();
  auth = createAuth(db, { nextjs: false, rateLimitEnabled: true });
  await createCredentialUser(db, {
    email: "ogretmen@test.okul",
    name: "Öğretmen",
    password: PASSWORD,
    role: "teacher",
  });
  await createCredentialUser(db, { email: "veli@test.okul", name: "Veli", password: PASSWORD, role: "parent" });
});

async function signIn(email: string, password = PASSWORD) {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return new Headers({ cookie });
}

function postSignIn(email: string, password: string, ip: string) {
  return auth.handler(
    new Request(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE_URL, "x-forwarded-for": ip },
      body: JSON.stringify({ email, password }),
    }),
  );
}

describe("email sign-in", () => {
  it("signs in a seeded user and exposes their role on the session", async () => {
    const headers = await signIn("ogretmen@test.okul");
    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe("ogretmen@test.okul");
    expect(session?.user.role).toBe("teacher");
  });

  it("rejects a wrong password", async () => {
    await expect(
      auth.api.signInEmail({ body: { email: "ogretmen@test.okul", password: "yanlis-sifre" } }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects an unknown email", async () => {
    await expect(
      auth.api.signInEmail({ body: { email: "yok@test.okul", password: PASSWORD } }),
    ).rejects.toMatchObject({ statusCode: 401, body: { code: "INVALID_EMAIL_OR_PASSWORD" } });
  });
});

describe("registration and role integrity", () => {
  it("does not allow open sign-up", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: "yeni@test.okul", password: PASSWORD, name: "Yeni" } }),
    ).rejects.toMatchObject({ statusCode: 400, body: { code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" } });

    const rows = await db.select().from(user).where(eq(user.email, "yeni@test.okul"));
    expect(rows).toHaveLength(0);
  });

  it("does not let a parent change their own role or school", async () => {
    const headers = await signIn("veli@test.okul");
    await expect(
      auth.api.updateUser({
        headers,
        // Deliberately bypass the typed body: this is what a malicious client would send.
        body: { role: "admin", schoolId: "00000000-0000-4000-8000-000000000000" } as never,
      }),
    ).rejects.toMatchObject({ statusCode: 400, body: { code: "FIELD_NOT_ALLOWED" } });

    const [row] = await db.select().from(user).where(eq(user.email, "veli@test.okul"));
    expect(row?.role).toBe("parent");
    expect(row?.schoolId).toBeNull();
  });
});

describe("sign-in rate limiting", () => {
  it("blocks the 6th sign-in attempt within a minute from the same IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await postSignIn("ogretmen@test.okul", "yanlis-sifre", "203.0.113.7");
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);

    // A different IP is not affected.
    const other = await postSignIn("ogretmen@test.okul", PASSWORD, "203.0.113.8");
    expect(other.status).toBe(200);
  });
});
