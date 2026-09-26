import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { assertParentOfStudent } from "@/server/auth/guards";
import { createNode, setNodeArchived } from "@/server/services/curriculum";
import { getRoadmapForParent, setProgress } from "@/server/services/progress";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

// Fixture: parent A → studentA1 (Ada, class A) and studentB1 (Can, class B);
// parent B → studentA2 (Ali, class A).
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let stages: string[];
let archivedTopic: string;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  const t = fx.users.teacherA;
  const A = fx.classes.classA.id;
  const math = await createNode(db, t, "subject", A, "Matematik");
  const addition = await createNode(db, t, "topic", math, "Toplama");
  stages = [
    await createNode(db, t, "stage", addition, "Onluk bozmadan"),
    await createNode(db, t, "stage", addition, "Onluk bozarak"),
    await createNode(db, t, "stage", addition, "Problemler"),
  ];
  archivedTopic = await createNode(db, t, "topic", math, "Eski konu");
  await createNode(db, t, "stage", archivedTopic, "Gizli durak");
  await setNodeArchived(db, t, "topic", archivedTopic, true);

  const set = (studentId: string, stageId: string, status: "in_progress" | "completed", stars?: number) =>
    setProgress(db, t, A, { studentId, stageId, status, stars });
  await set(fx.students.studentA1.id, stages[0]!, "completed", 2);
  await set(fx.students.studentA1.id, stages[1]!, "in_progress");
  await set(fx.students.studentA2.id, stages[0]!, "completed", 3);
  await set(fx.students.studentA2.id, stages[1]!, "completed", 1);
});

describe("getRoadmapForParent", () => {
  it("shows the child's own statuses for every live stage, with progress totals", async () => {
    const { child, subjects } = await getRoadmapForParent(db, fx.users.parentA.id, fx.students.studentA1.id);
    expect(child.firstName).toBe("Ada");
    expect(subjects).toHaveLength(1);
    const math = subjects[0]!;
    expect(math.topics.map((t) => t.name)).toEqual(["Toplama"]); // archived topic hidden
    expect(math.topics[0]!.stages.map((s) => [s.name, s.status, s.stars])).toEqual([
      ["Onluk bozmadan", "completed", 2],
      ["Onluk bozarak", "in_progress", null],
      ["Problemler", "not_started", null],
    ]);
    expect({ completed: math.completed, total: math.total }).toEqual({ completed: 1, total: 3 });
  });

  it("a child whose class has no curriculum gets an empty roadmap", async () => {
    const { subjects } = await getRoadmapForParent(db, fx.users.parentA.id, fx.students.studentB1.id);
    expect(subjects).toEqual([]);
  });
});

describe("Veli A, öğrenci B'nin yol haritasına erişemez", () => {
  it("parent A is refused for a classmate of their own child", async () => {
    await expect(getRoadmapForParent(db, fx.users.parentA.id, fx.students.studentA2.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(assertParentOfStudent(fx.users.parentA, fx.students.studentA2.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("parent B is refused for parent A's children and for deleted children", async () => {
    for (const s of [fx.students.studentA1, fx.students.studentB1]) {
      await expect(getRoadmapForParent(db, fx.users.parentB.id, s.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    await expect(
      getRoadmapForParent(db, fx.users.parentA.id, fx.students.deletedStudent.id),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("the roadmap payload contains nothing about other students", async () => {
    const roadmap = await getRoadmapForParent(db, fx.users.parentA.id, fx.students.studentA1.id);
    const payload = JSON.stringify(roadmap);
    expect(payload).not.toContain(fx.students.studentA2.id);
    expect(payload).not.toContain("Ali");
    // Ali completed stage 2 with a star; Ada's view must still show her own in_progress.
    expect(roadmap.subjects[0]!.topics[0]!.stages[1]!.status).toBe("in_progress");
    expect(payload).not.toContain("Gizli durak");
  });

  it("teachers cannot use the parent roadmap", async () => {
    await expect(
      getRoadmapForParent(db, fx.users.teacherA.id, fx.students.studentA1.id),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
