import type { Metadata } from "next";
import { AdventureMap } from "@/components/progress/adventure-map";
import { possessiveName } from "@/lib/student-names";
import { db } from "@/server/db";
import { assertParentOfStudent } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getRoadmapForParent } from "@/server/services/progress";

export const metadata: Metadata = { title: "Macera haritası" };

export default async function RoadmapPage({ params }: PageProps<"/veli/[ogrenciId]/yol-haritasi">) {
  const { ogrenciId } = await params;
  const { user } = await requirePageRole("parent");
  // Another child's id renders 404; the service filters through parent_student as well.
  await orNotFound(assertParentOfStudent(user, ogrenciId));
  const { child, subjects } = await orNotFound(getRoadmapForParent(db, user.id, ogrenciId));

  // The way back to the child's dashboard is the "Ana sayfa" button in the header.
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{possessiveName(child.firstName)} macera haritası</h1>
        <p className="text-muted-foreground">Derslerdeki duraklar ve {child.firstName} şu an nerede.</p>
      </div>
      <AdventureMap subjects={subjects} stage={child.stage} childName={child.firstName} />
    </div>
  );
}
