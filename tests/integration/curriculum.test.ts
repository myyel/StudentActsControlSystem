import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { studentProgress } from "@/server/db/schema";
import { assertTeacherOfClass } from "@/server/auth/guards";
import {
  createNode,
  getArchivedNodes,
  getCurriculum,
  getNodeClassId,
  getParentClassId,
  renameNode,
  reorderChildren,
  setNodeArchived,
} from "@/server/services/curriculum";
import { nodeNameSchema } from "@/server/validation/curriculum";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let math: string;
let addition: string;
const stages: string[] = [];

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  const t = fx.users.teacherA;
  const A = fx.classes.classA.id;
  math = await createNode(db, t, "subject", A, "Matematik");
  await createNode(db, t, "subject", A, "Türkçe");
  addition = await createNode(db, t, "topic", math, "Toplama");
  await createNode(db, t, "topic", math, "Çıkarma");
  for (const name of ["Onluk bozmadan", "Onluk bozarak", "Problemler"]) {
    stages.push(await createNode(db, t, "stage", addition, name));
  }
});

describe("getCurriculum", () => {
  it("returns the ordered tree, appending new nodes at the end", async () => {
    const tree = await getCurriculum(db, fx.classes.classA.id);
    expect(tree.map((s) => s.name)).toEqual(["Matematik", "Türkçe"]);
    expect(tree[0]!.topics.map((t) => t.name)).toEqual(["Toplama", "Çıkarma"]);
    expect(tree[0]!.topics[0]!.stages.map((s) => s.name)).toEqual(["Onluk bozmadan", "Onluk bozarak", "Problemler"]);
  });

  it("is scoped to the class", async () => {
    expect(await getCurriculum(db, fx.classes.classB.id)).toEqual([]);
  });
});

describe("reorderChildren", () => {
  it("applies a full permutation of the live children", async () => {
    const reversed = [...stages].reverse();
    await reorderChildren(db, fx.users.teacherA, "stage", addition, reversed);
    const tree = await getCurriculum(db, fx.classes.classA.id);
    expect(tree[0]!.topics[0]!.stages.map((s) => s.id)).toEqual(reversed);
    await reorderChildren(db, fx.users.teacherA, "stage", addition, stages);
  });

  it("rejects missing, duplicate and foreign ids", async () => {
    const t = fx.users.teacherA;
    await expect(reorderChildren(db, t, "stage", addition, stages.slice(0, 2))).rejects.toThrow(/Liste değişmiş/);
    await expect(reorderChildren(db, t, "stage", addition, [stages[0]!, stages[0]!, stages[1]!])).rejects.toThrow(
      /Liste değişmiş/,
    );
    await expect(reorderChildren(db, t, "stage", addition, [...stages.slice(0, 2), newUuid()])).rejects.toThrow(
      /Liste değişmiş/,
    );
  });
});

describe("archiving", () => {
  it("hides archived nodes and their children, keeps progress, and restores them", async () => {
    await db.insert(studentProgress).values({ studentId: fx.students.studentA1.id, stageId: stages[0]!, status: "completed" });

    await setNodeArchived(db, fx.users.teacherA, "topic", addition, true);
    let tree = await getCurriculum(db, fx.classes.classA.id);
    expect(tree[0]!.topics.map((t) => t.name)).toEqual(["Çıkarma"]);
    expect((await getArchivedNodes(db, fx.classes.classA.id)).map((n) => n.name)).toEqual(["Toplama"]);
    expect(await db.select().from(studentProgress).where(eq(studentProgress.stageId, stages[0]!))).toHaveLength(1);

    await setNodeArchived(db, fx.users.teacherA, "topic", addition, false);
    tree = await getCurriculum(db, fx.classes.classA.id);
    expect(tree[0]!.topics[0]!.stages).toHaveLength(3);
  });

  it("archived children do not count when reordering", async () => {
    await setNodeArchived(db, fx.users.teacherA, "stage", stages[2]!, true);
    await reorderChildren(db, fx.users.teacherA, "stage", addition, [stages[1]!, stages[0]!]);
    await setNodeArchived(db, fx.users.teacherA, "stage", stages[2]!, false);
  });
});

describe("rename and validation", () => {
  it("renames a node", async () => {
    await renameNode(db, fx.users.teacherA, "subject", math, "Matematik 2");
    expect((await getCurriculum(db, fx.classes.classA.id))[0]!.name).toBe("Matematik 2");
  });

  it("validates names per level", () => {
    expect(nodeNameSchema("stage").safeParse("  ").success).toBe(false);
    expect(nodeNameSchema("subject").safeParse("x".repeat(61)).success).toBe(false);
    expect(nodeNameSchema("stage").safeParse("x".repeat(80)).success).toBe(true);
  });
});

describe("öğretmen başka sınıfı değiştiremez", () => {
  // Actions resolve the node's class, then run assertTeacherOfClass.
  it("teacher B fails the guard for every level of class A's curriculum", async () => {
    const forbidden = { code: "FORBIDDEN" };
    const tB = fx.users.teacherB;
    await expect(assertTeacherOfClass(tB, await getNodeClassId(db, "subject", math))).rejects.toMatchObject(forbidden);
    await expect(assertTeacherOfClass(tB, await getNodeClassId(db, "topic", addition))).rejects.toMatchObject(forbidden);
    await expect(assertTeacherOfClass(tB, await getNodeClassId(db, "stage", stages[0]!))).rejects.toMatchObject(forbidden);
    // Creating under class A's nodes or directly in class A.
    await expect(assertTeacherOfClass(tB, await getParentClassId(db, "stage", addition))).rejects.toMatchObject(forbidden);
    await expect(
      assertTeacherOfClass(tB, await getParentClassId(db, "subject", fx.classes.classA.id)),
    ).rejects.toMatchObject(forbidden);
  });

  it("unknown ids are forbidden, not errors", async () => {
    await expect(getNodeClassId(db, "stage", newUuid())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getParentClassId(db, "subject", newUuid())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
