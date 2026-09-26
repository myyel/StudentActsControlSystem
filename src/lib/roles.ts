import type { UserRole } from "@/server/db/schema";

export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  parent: "/veli",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Yönetici",
  teacher: "Öğretmen",
  parent: "Veli",
};
