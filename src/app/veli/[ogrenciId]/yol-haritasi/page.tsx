import type { Metadata } from "next";
import Link from "next/link";
import { Roadmap } from "@/components/progress/roadmap";
import { formatStudentName } from "@/lib/student-names";
import { db } from "@/server/db";
import { assertParentOfStudent } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getRoadmapForParent } from "@/server/services/progress";

export const metadata: Metadata = { title: "Yol haritası" };

export default async function RoadmapPage({ params }: PageProps<"/veli/[ogrenciId]/yol-haritasi">) {
  const { ogrenciId } = await params;
  const { user } = await requirePageRole("parent");
  // Another child's id renders 404; the service filters through parent_student as well.
  await orNotFound(assertParentOfStudent(user, ogrenciId));
  const { child, subjects } = await orNotFound(getRoadmapForParent(db, user.id, ogrenciId));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/veli" className="text-sm text-muted-foreground hover:underline">
          ← Çocuklarım
        </Link>
        <h1 className="text-2xl font-semibold">{formatStudentName(child)} · Yol haritası</h1>
        <p className="text-muted-foreground">Derslerdeki durakları ve çocuğunuzun şu an nerede olduğunu gösterir.</p>
      </div>
      <Roadmap subjects={subjects} />
    </div>
  );
}
