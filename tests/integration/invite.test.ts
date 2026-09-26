import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { auditLog, consentRecord, inviteCode, parentStudent, student, user } from "@/server/db/schema";
import { KVKK_DOC_VERSION } from "@/content/kvkk";
import { formatInviteCode, normalizeInviteCode } from "@/lib/invite-code";
import {
  createInviteCodes,
  DEFAULT_INVITE_OPTIONS,
  hashInviteCode,
  listInvitesForStudent,
  previewInviteCode,
  redeemInviteCode,
  revokeInviteCode,
} from "@/server/services/invite";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

async function newCode(studentId: string, options = DEFAULT_INVITE_OPTIONS) {
  const [created] = await createInviteCodes(db, fx.users.teacherA, [studentId], options);
  return created!.code;
}

async function newParent(email: string) {
  const [row] = await db.insert(user).values({ email, name: email, role: "parent" }).returning();
  return row!.id;
}

const redeem = (parentId: string, code: string) =>
  db.transaction((tx) =>
    redeemInviteCode(tx, { parentId, code, relation: "mother", ip: "198.51.100.1", userAgent: "test" }),
  );

describe("code format", () => {
  it("normalizes spacing, dashes and case", () => {
    expect(normalizeInviteCode("abcd efgh")).toBe("ABCDEFGH");
    expect(normalizeInviteCode(" ABCD-EFGH ")).toBe("ABCDEFGH");
    expect(formatInviteCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });

  it("rejects wrong length and confusable characters", () => {
    expect(normalizeInviteCode("ABCDEFG")).toBeNull();
    expect(normalizeInviteCode("ABCDEFGO")).toBeNull(); // O is not in the alphabet
    expect(normalizeInviteCode("ABCDEF10")).toBeNull();
  });
});

describe("createInviteCodes", () => {
  it("stores only the hash and defaults to single-use, 14 days", async () => {
    const code = await newCode(fx.students.studentA2.id);
    const rows = await db.select().from(inviteCode).where(eq(inviteCode.codeHash, hashInviteCode(code)));
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.singleUse).toBe(true);
    const days = (row.expiresAt!.getTime() - row.createdAt.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(14);
    // The plain code appears nowhere in the stored row.
    expect(JSON.stringify(row)).not.toContain(code);
  });

  it("rejects unknown student ids", async () => {
    await expect(
      createInviteCodes(db, fx.users.teacherA, ["00000000-0000-4000-8000-000000000000"], DEFAULT_INVITE_OPTIONS),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("previewInviteCode", () => {
  it("shows only first name, surname initial and class", async () => {
    const code = await newCode(fx.students.studentA2.id);
    const preview = await previewInviteCode(db, formatInviteCode(code).toLowerCase());
    expect(preview).toEqual({
      status: "active",
      child: { firstName: "Ali", lastInitial: null, className: "2-A" },
    });
  });

  it("reports invalid, revoked and expired codes", async () => {
    expect((await previewInviteCode(db, "ZZZZ-ZZZZ")).status).toBe("invalid");
    expect((await previewInviteCode(db, "nonsense")).status).toBe("invalid");

    const revoked = await newCode(fx.students.studentA2.id);
    const [row] = await db.select().from(inviteCode).where(eq(inviteCode.codeHash, hashInviteCode(revoked)));
    await revokeInviteCode(db, fx.users.teacherA, row!.id);
    expect((await previewInviteCode(db, revoked)).status).toBe("revoked");

    const expired = await newCode(fx.students.studentA2.id, { singleUse: true, validDays: 7 });
    await db
      .update(inviteCode)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(inviteCode.codeHash, hashInviteCode(expired)));
    expect((await previewInviteCode(db, expired)).status).toBe("expired");
  });

  it("treats codes of deleted students as invalid", async () => {
    const code = await newCode(fx.students.deletedStudent.id);
    expect((await previewInviteCode(db, code)).status).toBe("invalid");
  });
});

describe("redeemInviteCode", () => {
  it("links the parent, consumes a single-use code, records consents and audit", async () => {
    const parentId = await newParent("p-redeem@test.okul");
    const code = await newCode(fx.students.studentA2.id);

    const result = await redeem(parentId, code);
    expect(result).toEqual({ studentId: fx.students.studentA2.id, alreadyLinked: false });

    const [link] = await db
      .select()
      .from(parentStudent)
      .where(and(eq(parentStudent.parentId, parentId), eq(parentStudent.studentId, fx.students.studentA2.id)));
    expect(link?.relation).toBe("mother");

    const consents = await db.select().from(consentRecord).where(eq(consentRecord.userId, parentId));
    expect(consents.map((c) => c.kind).sort()).toEqual(["explicit_consent", "privacy_notice"]);
    expect(consents.every((c) => c.docVersion === KVKK_DOC_VERSION && c.ip === "198.51.100.1")).toBe(true);

    const audit = await db.select().from(auditLog).where(eq(auditLog.action, "parent.link"));
    expect(audit.some((a) => a.entityId === `${parentId}:${fx.students.studentA2.id}`)).toBe(true);

    // Second use by another parent fails.
    await expect(redeem(fx.users.parentA.id, code)).rejects.toThrow(/daha önce kullanılmış/);
    expect((await previewInviteCode(db, code)).status).toBe("used");
  });

  it("is idempotent for a parent who is already linked", async () => {
    const code = await newCode(fx.students.studentA1.id);
    await expect(redeem(fx.users.parentA.id, code)).resolves.toEqual({
      studentId: fx.students.studentA1.id,
      alreadyLinked: true,
    });
    // The code was not consumed.
    expect((await previewInviteCode(db, code)).status).toBe("active");
  });

  it("lets a multi-use code link two parents", async () => {
    const code = await newCode(fx.students.studentB1.id, { singleUse: false, validDays: 14 });
    await redeem(fx.users.parentB.id, code);
    const links = await db.select().from(parentStudent).where(eq(parentStudent.studentId, fx.students.studentB1.id));
    expect(links.map((l) => l.parentId).sort()).toEqual([fx.users.parentA.id, fx.users.parentB.id].sort());
    expect((await previewInviteCode(db, code)).status).toBe("active");
  });

  it("rejects invalid codes and codes of archived classes or inactive students without linking", async () => {
    const parentId = await newParent("p-reject@test.okul");
    await expect(redeem(parentId, "ZZZZ-ZZZZ")).rejects.toThrow(/geçersiz/);

    const archivedClassCode = await newCode(fx.students.studentAOld.id);
    await expect(redeem(parentId, archivedClassCode)).rejects.toThrow(/geçersiz/);

    const inactiveCode = await newCode(fx.students.studentA2.id);
    await db.update(student).set({ active: false }).where(eq(student.id, fx.students.studentA2.id));
    await expect(redeem(parentId, inactiveCode)).rejects.toThrow(/geçersiz/);
    await db.update(student).set({ active: true }).where(eq(student.id, fx.students.studentA2.id));

    const links = await db.select().from(parentStudent).where(eq(parentStudent.parentId, parentId));
    expect(links).toHaveLength(0);
  });

  it("allows exactly one of two concurrent redemptions of a single-use code", async () => {
    const [p1, p2] = await Promise.all([newParent("p-race1@test.okul"), newParent("p-race2@test.okul")]);
    const code = await newCode(fx.students.studentA2.id);

    const results = await Promise.allSettled([redeem(p1, code), redeem(p2, code)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && String(rejected.reason)).toMatch(/daha önce kullanılmış/);
  });
});

describe("listInvitesForStudent", () => {
  it("computes statuses", async () => {
    const invites = await listInvitesForStudent(db, fx.students.studentA2.id);
    const statuses = new Set(invites.map((i) => i.status));
    expect(statuses).toEqual(new Set(["active", "used", "revoked", "expired"]));
  });
});
