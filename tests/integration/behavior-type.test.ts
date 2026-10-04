import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_BEHAVIORS } from "@/content/default-behaviors";
import { db } from "@/server/db";
import { behaviorType } from "@/server/db/schema";
import { assertTeacherOfClass } from "@/server/auth/guards";
import {
  createBehaviorType,
  getBehaviorTypeClassId,
  listBehaviorTypes,
  loadDefaultBehaviorTypes,
  moveBehaviorType,
  updateBehaviorType,
} from "@/server/services/behavior-type";
import { createClass } from "@/server/services/class";
import { behaviorTypeSchema } from "@/server/validation/behavior";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

describe("default behaviors", () => {
  it("a new class starts with the approved default list", async () => {
    const cls = await createClass(db, fx.users.teacherA, { name: "4-D", gradeLevels: [4], academicYear: "2026-2027" });
    const types = await listBehaviorTypes(db, cls.id);
    expect(types).toHaveLength(DEFAULT_BEHAVIORS.length);
    expect(types.filter((t) => t.scope === "home").every((t) => t.points > 0)).toBe(true);
    expect(types.some((t) => t.scope === "school" && t.points < 0)).toBe(true);
  });

  it("loads defaults only into a class without types", async () => {
    await loadDefaultBehaviorTypes(db, fx.classes.classA.id);
    expect(await listBehaviorTypes(db, fx.classes.classA.id)).toHaveLength(DEFAULT_BEHAVIORS.length);
    await loadDefaultBehaviorTypes(db, fx.classes.classA.id);
    expect(await listBehaviorTypes(db, fx.classes.classA.id)).toHaveLength(DEFAULT_BEHAVIORS.length);
  });
});

describe("behaviorTypeSchema", () => {
  const valid = { name: "Resim yaptı", icon: "🎨", points: "2", scope: "school" };

  it("accepts school points from -10 to 10 except 0", () => {
    expect(behaviorTypeSchema.safeParse({ ...valid, points: "-10" }).success).toBe(true);
    expect(behaviorTypeSchema.safeParse({ ...valid, points: "10" }).success).toBe(true);
    for (const p of ["0", "11", "-11", "1.5", ""]) {
      expect(behaviorTypeSchema.safeParse({ ...valid, points: p }).success, p).toBe(false);
    }
  });

  it("rejects negative home behaviors", () => {
    const result = behaviorTypeSchema.safeParse({ ...valid, scope: "home", points: "-1" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/yalnızca olumlu/);
  });
});

describe("database constraints", () => {
  it("rejects negative home behaviors and zero points even if validation is bypassed", async () => {
    const base = { classId: fx.classes.classA.id, name: "x", icon: "x" };
    await expect(db.insert(behaviorType).values({ ...base, points: -1, scope: "home" })).rejects.toThrow();
    await expect(db.insert(behaviorType).values({ ...base, points: 0, scope: "school" })).rejects.toThrow();
  });
});

describe("editing and ordering", () => {
  it("adds new types at the end of their scope", async () => {
    const created = await createBehaviorType(db, fx.users.teacherA, fx.classes.classA.id, {
      name: "Resim yaptı",
      icon: "🎨",
      points: 2,
      scope: "school",
    });
    const school = await listBehaviorTypes(db, fx.classes.classA.id, { scope: "school" });
    expect(school.at(-1)?.id).toBe(created.id);
  });

  it("moves a type up and down within its scope", async () => {
    const before = await listBehaviorTypes(db, fx.classes.classA.id, { scope: "school" });
    await moveBehaviorType(db, before[1]!.id, "up");
    const after = await listBehaviorTypes(db, fx.classes.classA.id, { scope: "school" });
    expect(after.slice(0, 2).map((t) => t.id)).toEqual([before[1]!.id, before[0]!.id]);

    // Moving past the ends is a no-op.
    await moveBehaviorType(db, after[0]!.id, "up");
    expect((await listBehaviorTypes(db, fx.classes.classA.id, { scope: "school" }))[0]!.id).toBe(after[0]!.id);
  });

  it("deactivated types are hidden from active-only lists", async () => {
    const [first] = await listBehaviorTypes(db, fx.classes.classA.id, { scope: "school" });
    await updateBehaviorType(db, fx.users.teacherA, first!.id, { active: false });
    const active = await listBehaviorTypes(db, fx.classes.classA.id, { scope: "school", activeOnly: true });
    expect(active.map((t) => t.id)).not.toContain(first!.id);
    const [row] = await db.select().from(behaviorType).where(eq(behaviorType.id, first!.id));
    expect(row?.active).toBe(false);
  });
});

describe("authorization", () => {
  it("teacher B cannot reach teacher A's behavior types", async () => {
    const [aType] = await listBehaviorTypes(db, fx.classes.classA.id);
    // Actions resolve the type's class and then run this guard.
    const classId = await getBehaviorTypeClassId(db, aType!.id);
    await expect(assertTeacherOfClass(fx.users.teacherB, classId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(assertTeacherOfClass(fx.users.parentA, classId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
