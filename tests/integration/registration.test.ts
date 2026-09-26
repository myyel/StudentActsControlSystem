import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { account, auditLog, consentRecord, parentStudent, user } from "@/server/db/schema";
import { createAuth } from "@/server/auth/auth";
import { createInviteCodes, DEFAULT_INVITE_OPTIONS } from "@/server/services/invite";
import { EMAIL_TAKEN, registerParentWithInvite } from "@/server/services/parent";
import { registerParentSchema } from "@/server/validation/parent";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

async function codeFor(studentId: string) {
  const [created] = await createInviteCodes(db, fx.users.teacherA, [studentId], DEFAULT_INVITE_OPTIONS);
  return created!.code;
}

const base = {
  name: "Yeni Veli",
  password: "Sifre1234!",
  relation: "mother" as const,
  ip: "198.51.100.9",
  userAgent: "vitest",
};

describe("registerParentWithInvite", () => {
  it("creates a parent without a school, links the child, records consents and audit, and can sign in", async () => {
    const code = await codeFor(fx.students.studentA2.id);
    const { parentId, studentId } = await registerParentWithInvite(db, {
      ...base,
      code,
      email: "Yeni.Veli@Test.Okul",
    });
    expect(studentId).toBe(fx.students.studentA2.id);

    const [row] = await db.select().from(user).where(eq(user.id, parentId));
    expect(row).toMatchObject({ role: "parent", schoolId: null, email: "yeni.veli@test.okul" });

    const links = await db.select().from(parentStudent).where(eq(parentStudent.parentId, parentId));
    expect(links).toMatchObject([{ studentId, relation: "mother" }]);

    const consents = await db.select().from(consentRecord).where(eq(consentRecord.userId, parentId));
    expect(consents).toHaveLength(2);
    expect(consents.every((c) => c.studentId === studentId && c.userAgent === "vitest")).toBe(true);

    const audit = await db.select().from(auditLog).where(eq(auditLog.actorId, parentId));
    expect(audit.map((a) => a.action)).toEqual(["parent.link"]);

    const auth = createAuth(db, { nextjs: false });
    const session = await auth.api.signInEmail({ body: { email: "yeni.veli@test.okul", password: base.password } });
    expect(session.user.role).toBe("parent");
  });

  it("rejects an email that already has an account", async () => {
    const code = await codeFor(fx.students.studentA2.id);
    await expect(
      registerParentWithInvite(db, { ...base, code, email: "parentA@test" }),
    ).rejects.toThrow(EMAIL_TAKEN);
  });

  it("leaves no account behind when the code is invalid", async () => {
    await expect(
      registerParentWithInvite(db, { ...base, code: "ZZZZ-ZZZZ", email: "orphan@test.okul" }),
    ).rejects.toThrow(/geçersiz/);

    expect(await db.select().from(user).where(eq(user.email, "orphan@test.okul"))).toHaveLength(0);
    const accounts = await db.select({ id: account.id }).from(account);
    const users = await db.select({ id: user.id }).from(user).innerJoin(account, eq(account.userId, user.id));
    expect(accounts).toHaveLength(users.length);
  });

  it("leaves no account behind when a single-use code was already used", async () => {
    const code = await codeFor(fx.students.studentA2.id);
    await registerParentWithInvite(db, { ...base, code, email: "first@test.okul" });
    await expect(registerParentWithInvite(db, { ...base, code, email: "second@test.okul" })).rejects.toThrow(
      /daha önce kullanılmış/,
    );
    expect(await db.select().from(user).where(eq(user.email, "second@test.okul"))).toHaveLength(0);
  });
});

describe("registerParentSchema", () => {
  const valid = {
    code: "ABCD-EFGH",
    name: "Veli",
    email: "veli@ornek.okul",
    password: "Sifre1234!",
    relation: "father",
    privacyNotice: "on",
    explicitConsent: "on",
  };

  it("accepts a complete form", () => {
    expect(registerParentSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["privacyNotice", "explicitConsent"])("requires %s to be checked", (field) => {
    const form: Record<string, string> = { ...valid };
    delete form[field];
    expect(registerParentSchema.safeParse(form).success).toBe(false);
  });

  it("rejects a client-supplied role and unknown relations", () => {
    const parsed = registerParentSchema.parse({ ...valid, role: "admin" });
    expect(parsed).not.toHaveProperty("role");
    expect(registerParentSchema.safeParse({ ...valid, relation: "admin" }).success).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(registerParentSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
  });
});
