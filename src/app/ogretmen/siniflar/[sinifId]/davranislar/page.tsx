import Link from "next/link";
import { createBehaviorTypeAction } from "@/app/ogretmen/behavior-type-actions";
import { BehaviorTypeForm } from "@/components/behaviors/behavior-type-form";
import { BehaviorTypeList } from "@/components/behaviors/behavior-type-list";
import { LoadDefaultsButton } from "@/components/behaviors/load-defaults-button";
import { ClassNav } from "@/components/classes/class-nav";
import { HomeCapForm } from "@/components/classes/home-cap-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { listBehaviorTypes } from "@/server/services/behavior-type";
import { getClass } from "@/server/services/class";

export default async function BehaviorTypesPage({
  params,
  searchParams,
}: PageProps<"/ogretmen/siniflar/[sinifId]/davranislar">) {
  const { sinifId } = await params;
  const scope = (await searchParams).kapsam === "ev" ? "home" : "school";
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, allTypes] = await Promise.all([getClass(db, sinifId), listBehaviorTypes(db, sinifId)]);
  const types = allTypes.filter((t) => t.scope === scope);
  const base = `/ogretmen/siniflar/${sinifId}/davranislar`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="davranislar" />

      {allTypes.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-4">
          <p>Bu sınıfta henüz davranış yok. Hazır listeyi yükleyip sonra düzenleyebilirsiniz.</p>
          <LoadDefaultsButton classId={sinifId} />
        </div>
      )}

      <nav aria-label="Kapsam" className="flex gap-2">
        {(
          [
            ["school", "Okul", base],
            ["home", "Ev", `${base}?kapsam=ev`],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={scope === key ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-md border px-4 font-medium",
              scope === key ? "border-primary bg-primary/10" : "hover:bg-accent",
            )}
          >
            {label} ({allTypes.filter((t) => t.scope === key).length})
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted-foreground">
        {scope === "school"
          ? "Derste öğrencilere verdiğiniz davranışlar. Olumsuz davranışlar yalnızca öğretmen ve veli ekranlarında görünür."
          : "Velilerin evde işaretleyebileceği davranışlar. Yalnızca olumlu puanlı olabilir."}
      </p>

      {scope === "home" && (
        <Card>
          <CardHeader>
            <CardTitle>Günlük ev XP tavanı</CardTitle>
          </CardHeader>
          <CardContent>
            <HomeCapForm classId={sinifId} cap={cls.homeDailyXpCap} />
          </CardContent>
        </Card>
      )}

      <BehaviorTypeList key={scope} items={types} scope={scope} />

      <Card>
        <CardHeader>
          <CardTitle>{scope === "school" ? "Okul davranışı ekle" : "Ev davranışı ekle"}</CardTitle>
        </CardHeader>
        <CardContent>
          <BehaviorTypeForm
            key={scope}
            scope={scope}
            action={createBehaviorTypeAction.bind(null, sinifId)}
            submitLabel="Ekle"
          />
        </CardContent>
      </Card>
    </div>
  );
}
