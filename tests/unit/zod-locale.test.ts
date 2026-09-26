import { describe, expect, it } from "vitest";
import { toActionError } from "@/server/action-result";
import { registerParentSchema } from "@/server/validation/parent";

describe("validation messages", () => {
  it("are Turkish even for fields without a custom message", () => {
    const result = registerParentSchema.safeParse({});
    expect(result.success).toBe(false);
    const actionError = toActionError(result.error);
    expect(actionError.ok).toBe(false);
    if (!actionError.ok) {
      expect(actionError.error).not.toMatch(/Invalid input|expected/);
      expect(actionError.error).toMatch(/Geçersiz|girin|seçin/);
    }
  });
});
