import Link from "next/link";
import { ClassNav } from "@/components/classes/class-nav";
import { ClassMatrix } from "@/components/progress/class-matrix";
import { buttonVariants } from "@/components/ui/button";
import { tabBarSm, tabItemCurrent, tabItemIdle, tabItemSm } from "@/components/action-styles";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getClass } from "@/server/services/class";
import { getCurriculum } from "@/server/services/curriculum";
import { getClassMatrix } from "@/server/services/progress";

export default async function MatrixPage({ params, searchParams }: PageProps<"/ogretmen/siniflar/[sinifId]/matris">) {
  const { sinifId } = await params;
  const { ders } = await searchParams;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, tree] = await Promise.all([getClass(db, sinifId), getCurriculum(db, sinifId)]);
  const base = `/ogretmen/siniflar/${sinifId}/matris`;

  if (tree.length === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <ClassNav classId={sinifId} className={cls.name} active="matris" />
        <p className="text-muted-foreground">Henüz ders yok.</p>
        <Link href={`/ogretmen/siniflar/${sinifId}/duraklar`} className={buttonVariants({ className: "h-11 self-start" })}>
          Ders ve durak ekle
        </Link>
      </div>
    );
  }

  // Unknown or foreign subject ids fall back to the first subject of this class.
  const subjectId = tree.find((s) => s.id === ders)?.id ?? tree[0]!.id;
  const matrix = await getClassMatrix(db, sinifId, subjectId);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="matris" />
      <nav aria-label="Dersler" className={cn(tabBarSm, "flex w-fit max-w-full gap-0.5 overflow-x-auto")}>
        {matrix.subjects.map((s) => (
          <Link
            key={s.id}
            href={`${base}?ders=${s.id}`}
            aria-current={s.id === subjectId ? "page" : undefined}
            className={cn(tabItemSm, s.id === subjectId ? tabItemCurrent : tabItemIdle)}
          >
            {s.name}
            {s.gradeLevel !== null && (
              <span className="rounded-full bg-lav-soft px-2 text-xs font-bold text-lav-ink">{s.gradeLevel}. sınıf</span>
            )}
          </Link>
        ))}
      </nav>
      <ClassMatrix
        key={subjectId}
        classId={sinifId}
        subject={matrix.subject}
        students={matrix.students}
        progress={matrix.progress}
      />
    </div>
  );
}
