import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it.each(["/veli", "/davet/ABCD-EFGH", "/ogretmen/siniflar/x?y=1"])("accepts %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"])(
    "rejects %s",
    (path) => {
      expect(safeRedirectPath(path)).toBeNull();
    },
  );
});
