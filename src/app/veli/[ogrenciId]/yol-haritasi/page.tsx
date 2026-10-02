import type { Metadata } from "next";
import { BackLink } from "@/components/layout/back-link";
import { AdventureMap } from "@/components/progress/adventure-map";
import { formatStudentName, possessiveName } from "@/lib/student-names";
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <BackLink href={`/veli/${child.id}`}>{formatStudentName(child)} paneli</BackLink>
        <h1 className="font-display text-3xl font-extrabold">{possessiveName(child.firstName)} macera haritası</h1>
        <p className="text-muted-foreground">Derslerdeki duraklar ve {child.firstName} şu an nerede.</p>
      </div>
      <AdventureMap subjects={subjects} stage={child.stage} childName={child.firstName} />
    </div>
  );
}
