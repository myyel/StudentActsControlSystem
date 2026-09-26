import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { assertParentOfStudent } from "@/server/auth/guards";
import { createInviteCodes, DEFAULT_INVITE_OPTIONS, redeemInviteCode } from "@/server/services/invite";
import { getChildForParent, listChildrenForParent } from "@/server/services/parent";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };

// Fixture: parent A → studentA1 ("Ada", class A) and studentB1 ("Can", class B);
// parent B → studentA2 ("Ali", class A, Ada's classmate).
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

describe("Veli A, öğrenci B'yi göremez", () => {
  it("parent A's child list contains only their own children, and no other student's name anywhere", async () => {
    const children = await listChildrenForParent(db, fx.users.parentA.id);
    expect(children.map((c) => c.id).sort()).toEqual(
      [fx.students.studentA1.id, fx.students.studentB1.id].sort(),
    );

    const serialized = JSON.stringify(children);
    expect(serialized).not.toContain(fx.students.studentA2.id);
    expect(serialized).not.toContain(fx.students.studentA2.firstName);
  });

  it("parent A cannot open student B directly, even as a classmate of their own child", async () => {
    await expect(getChildForParent(db, fx.users.parentA.id, fx.students.studentA2.id)).rejects.toMatchObject(
      FORBIDDEN,
    );
    await expect(assertParentOfStudent(fx.users.parentA, fx.students.studentA2.id)).rejects.toMatchObject(
      FORBIDDEN,
    );
  });

  it("parent B cannot open parent A's children", async () => {
    for (const s of [fx.students.studentA1, fx.students.studentB1]) {
      await expect(getChildForParent(db, fx.users.parentB.id, s.id)).rejects.toMatchObject(FORBIDDEN);
      await expect(assertParentOfStudent(fx.users.parentB, s.id)).rejects.toMatchObject(FORBIDDEN);
    }
    const list = await listChildrenForParent(db, fx.users.parentB.id);
    expect(list.map((c) => c.id)).toEqual([fx.students.studentA2.id]);
  });

  it("a deleted child disappears from the parent's view", async () => {
    const list = await listChildrenForParent(db, fx.users.parentA.id);
    expect(list.map((c) => c.id)).not.toContain(fx.students.deletedStudent.id);
    await expect(
      getChildForParent(db, fx.users.parentA.id, fx.students.deletedStudent.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("a new parent sees nothing until redeeming a code, then only that child", async () => {
    const [parentC] = await db
      .insert(user)
      .values({ email: "parentC@test.okul", name: "C", role: "parent" })
      .returning();
    expect(await listChildrenForParent(db, parentC!.id)).toEqual([]);

    const [created] = await createInviteCodes(db, fx.users.teacherA, [fx.students.studentA2.id], DEFAULT_INVITE_OPTIONS);
    await db.transaction((tx) =>
      redeemInviteCode(tx, { parentId: parentC!.id, code: created!.code, relation: "father" }),
    );

    const list = await listChildrenForParent(db, parentC!.id);
    expect(list.map((c) => c.id)).toEqual([fx.students.studentA2.id]);
    // Linking to Ali grants nothing about Ada, who is in the same class.
    await expect(getChildForParent(db, parentC!.id, fx.students.studentA1.id)).rejects.toMatchObject(FORBIDDEN);
  });

  it("returns only the fields a parent may see", async () => {
    const child = await getChildForParent(db, fx.users.parentA.id, fx.students.studentA1.id);
    expect(Object.keys(child).sort()).toEqual(["className", "firstName", "id", "lastInitial", "relation"]);
  });
});
