import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CharacterImage } from "@/components/characters/character-image";
import { LevelBar } from "@/components/characters/level-bar";
import { ChildSwitcher } from "@/components/parents/child-switcher";
import { ParentMessageList } from "@/components/messages/parent-message-list";
import { IosInstallGuide } from "@/components/notifications/ios-install-guide";
import { HomeEntry } from "@/components/parents/home-entry";
import { RecentEvents } from "@/components/parents/recent-events";
import { WeekChart } from "@/components/timeline/week-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { assertParentOfStudent } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { listParentMessages } from "@/server/services/message";
import { listChildrenForParent } from "@/server/services/parent";
import { getParentDashboard } from "@/server/services/parent-dashboard";

export const metadata: Metadata = { title: "Veli paneli" };

export default async function ParentDashboardPage({ params }: PageProps<"/veli/[ogrenciId]">) {
  const { ogrenciId } = await params;
  const { user } = await requirePageRole("parent");
  // Another child's id renders 404; the service filters through parent_student as well.
  await orNotFound(assertParentOfStudent(user, ogrenciId));
  const [dashboard, children, unread] = await Promise.all([
    orNotFound(getParentDashboard(db, user.id, ogrenciId)),
    listChildrenForParent(db, user.id),
    listParentMessages(db, user.id, { studentId: ogrenciId, unreadOnly: true, limit: 3 }),
  ]);
  const { child, character, week, weekBalance, recent, subjects, home, timeZone } = dashboard;
  const name = formatStudentName(child);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <ChildSwitcher items={children} currentId={child.id} />
      <IosInstallGuide variant="banner" />

      <div>
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-muted-foreground">{child.className}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Karakter</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <CharacterImage stage={character.stage} size={128} />
            <div className="flex w-full min-w-0 flex-col gap-2">
              <p className="text-lg font-semibold">{character.stage.name}</p>
              <p className="text-sm text-muted-foreground">
                {character.level}. seviye · {character.xp} XP
              </p>
              <LevelBar level={character.level} progress={character.progress} />
              <p className="text-sm text-muted-foreground">
                {character.nextThreshold === null
                  ? "Son seviyeye ulaştı!"
                  : `Sonraki seviye ${character.nextThreshold} XP'de.`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bu hafta</CardTitle>
            <CardDescription>
              Son 7 günün davranış dengesi:{" "}
              <span
                className={cn(
                  "font-semibold",
                  weekBalance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
                )}
              >
                {weekBalance > 0 ? `+${weekBalance}` : weekBalance}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeekChart days={week} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evde bugün</CardTitle>
          <CardDescription>{name} bugün evde neler yaptı? Dokunun, hemen kaydedilir.</CardDescription>
        </CardHeader>
        <CardContent>
          <HomeEntry
            studentId={child.id}
            childName={name}
            types={home.types}
            todayXp={home.todayXp}
            cap={home.cap}
            disabled={!child.active}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Son olaylar</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentEvents items={recent} timeZone={timeZone} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Akademik yol haritası</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {subjects.length === 0 ? (
                <p className="text-muted-foreground">Öğretmen henüz ders durağı eklemedi.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {subjects.map((s) => (
                    <li key={s.id} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {s.completed} / {s.total} durak
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`${s.name}: ${s.completed} / ${s.total} durak`}
                        aria-valuemin={0}
                        aria-valuemax={s.total}
                        aria-valuenow={s.completed}
                        className="h-2 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${s.total ? (s.completed / s.total) * 100 : 0}%` }}
                        />
                      </div>
                      {s.current && <span className="text-sm text-muted-foreground">Şu an: {s.current}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/veli/${child.id}/yol-haritasi`}
                className={buttonVariants({ variant: "outline", className: "h-11 self-start" })}
              >
                Yol haritasını aç
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-5" aria-hidden />
                Okunmamış mesajlar
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ParentMessageList items={unread} empty="Okunmamış mesaj yok." />
              <Link
                href={`/veli/mesajlar?cocuk=${child.id}`}
                className={buttonVariants({ variant: "outline", className: "h-11 self-start" })}
              >
                Tüm mesajlar
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
