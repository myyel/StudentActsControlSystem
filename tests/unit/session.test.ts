import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePageRole, requireRole, requireSession } from "@/server/auth/session";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const teacherSession = {
  session: { id: "s1" },
  user: { id: "u1", name: "Öğretmen", role: "teacher", schoolId: "school-1" },
};

beforeEach(() => {
  getSession.mockReset();
});

describe("requireSession / requireRole", () => {
  it("throws UNAUTHENTICATED without a session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireSession()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(requireRole("teacher")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("throws FORBIDDEN for a role that is not allowed", async () => {
    getSession.mockResolvedValue(teacherSession);
    await expect(requireRole("admin")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireRole("parent")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the session for an allowed role", async () => {
    getSession.mockResolvedValue(teacherSession);
    await expect(requireRole("teacher", "admin")).resolves.toBe(teacherSession);
  });
});

describe("requirePageRole", () => {
  it("redirects to the login page without a session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requirePageRole("teacher")).rejects.toThrow("REDIRECT:/giris");
  });

  it("redirects to the user's own home for another role's page", async () => {
    getSession.mockResolvedValue(teacherSession);
    await expect(requirePageRole("parent")).rejects.toThrow("REDIRECT:/ogretmen");
    await expect(requirePageRole("admin")).rejects.toThrow("REDIRECT:/ogretmen");
  });

  it("returns the session for the matching role", async () => {
    getSession.mockResolvedValue(teacherSession);
    await expect(requirePageRole("teacher")).resolves.toBe(teacherSession);
  });
});
