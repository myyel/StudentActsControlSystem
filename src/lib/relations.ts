import type { ParentRelation } from "@/server/db/schema";

export const RELATION_LABEL: Record<ParentRelation, string> = {
  mother: "Anne",
  father: "Baba",
  guardian: "Vasi",
  other: "Diğer",
};
