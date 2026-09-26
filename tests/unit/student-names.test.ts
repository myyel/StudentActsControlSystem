import { describe, expect, it } from "vitest";
import { bulkStudentsSchema } from "@/server/validation/student";
import { formatStudentName, parseStudentLines, parseStudentName } from "@/lib/student-names";

describe("parseStudentName", () => {
  it.each([
    ["Ada Yılmaz", "Ada", "Y"],
    ["Ali Can Demir", "Ali Can", "D"],
    ["Elif K.", "Elif", "K"],
    ["Zeynep", "Zeynep", null],
    ["  ayşe   özkan  ", "Ayşe", "Ö"],
    ["ilker işık", "İlker", "İ"],
    ["ılgaz ırmak", "Ilgaz", "I"],
    ["ömer şahin", "Ömer", "Ş"],
    ["1. Ada Yılmaz", "Ada", "Y"],
    ["12) Can Ünal", "Can", "Ü"],
  ])("%s → %s %s", (raw, firstName, lastInitial) => {
    expect(parseStudentName(raw)).toEqual({ firstName, lastInitial });
  });

  it("returns null for blank lines", () => {
    expect(parseStudentName("   ")).toBeNull();
  });
});

describe("parseStudentLines", () => {
  it("skips blank lines and keeps original line numbers", () => {
    const lines = parseStudentLines("Ada Yılmaz\n\n\r\nAli Demir\n");
    expect(lines).toEqual([
      { line: 1, ok: true, value: { firstName: "Ada", lastInitial: "Y" } },
      { line: 4, ok: true, value: { firstName: "Ali", lastInitial: "D" } },
    ]);
  });

  it("flags names that are too long or have no letters", () => {
    const lines = parseStudentLines(`${"A".repeat(51)}\n123 456`);
    expect(lines.every((l) => !l.ok)).toBe(true);
  });

  it("formats names for display", () => {
    expect(formatStudentName({ firstName: "Ada", lastInitial: "Y" })).toBe("Ada Y.");
    expect(formatStudentName({ firstName: "Ada", lastInitial: null })).toBe("Ada");
  });
});

describe("bulkStudentsSchema", () => {
  it("accepts up to 60 names", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Öğrenci${i} A`).join("\n");
    expect(bulkStudentsSchema.parse(text)).toHaveLength(60);
  });

  it("rejects more than 60 names", () => {
    const text = Array.from({ length: 61 }, (_, i) => `Öğrenci${i} A`).join("\n");
    expect(bulkStudentsSchema.safeParse(text).success).toBe(false);
  });

  it("rejects empty input and any invalid line", () => {
    expect(bulkStudentsSchema.safeParse("\n  \n").success).toBe(false);
    expect(bulkStudentsSchema.safeParse(`Ada Y\n${"A".repeat(51)}`).success).toBe(false);
  });
});
