import { Plus } from "lucide-react";
import { ClassCard } from "@/components/classes/class-card";
import { CreateClassForm } from "@/components/classes/create-class-form";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listClassesForTeacher } from "@/server/services/class";
import { currentAcademicYear } from "@/server/validation/class";

export default async function TeacherHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  const { user } = await requirePageRole("teacher");
  const classes = await listClassesForTeacher(db, user.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Sınıflarım</h1>
        <p className="text-muted-foreground">
          Merhaba, {user.name}!{" "}
          {classes.length > 0 ? "Puanlamak için bir sınıf seçin." : "Başlamak için ilk sınıfınızı oluşturun."}
        </p>
      </div>

      {classes.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c, i) => (
            <li key={c.id}>
              <ClassCard cls={c} index={i} />
            </li>
          ))}
        </ul>
      )}

      <details
        open={classes.length === 0}
        className="group rounded-[1.75rem] border-2 border-dashed border-input bg-card/60 open:border-solid open:bg-card"
      >
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-[1.75rem] px-4 font-display text-lg font-extrabold hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-grass-soft text-grass-strong">
            <Plus className="size-6 transition-transform group-open:rotate-45" />
          </span>
          Yeni sınıf oluştur
        </summary>
        <div className="px-4 pb-5">
          <CreateClassForm defaultAcademicYear={currentAcademicYear()} />
        </div>
      </details>
    </div>
  );
}
