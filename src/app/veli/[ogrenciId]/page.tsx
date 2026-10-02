import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CharacterAvatar } from "@/components/characters/character-avatar";
import { primaryAction } from "@/components/layout/character-message";
import { CharacterHero } from "@/components/parents/character-hero";
import { ChildSwitcher } from "@/components/parents/child-switcher";
import { ParentMessageList } from "@/components/messages/parent-message-list";
import { IosInstallGuide } from "@/components/notifications/ios-install-guide";
import { HomeEntry } from "@/components/parents/home-entry";
import { RecentEvents } from "@/components/parents/recent-events";
import { WeekChart } from "@/components/timeline/week-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { characterNoun } from "@/lib/character";
import { formatStudentName, possessiveName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { assertParentOfStudent } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { listParentMessages } from "@/server/services/message";
import { listChildrenForParent } from "@/server/services/parent";
import { withStages } from "@/server/services/character";
import { getParentDashboard } from "@/server/services/parent-dashboard";

export const metadata: Metadata = { title: "Veli paneli" };

export default async function ParentDashboardPage({ params, searchParams }: PageProps<"/veli/[ogrenciId]">) {
  const { ogrenciId } = await params;
  // Set once by the invite redirect: a welcome in place of the dashboard.
  const { hosgeldin } = await searchParams;
  const { user } = await requirePageRole("parent");
  // Another child's id renders 404; the service filters through parent_student as well.
  await orNotFound(assertParentOfStudent(user, ogrenciId));
  const [dashboard, children, unread] = await Promise.all([
    orNotFound(getParentDashboard(db, user.id, ogrenciId)),
    listChildrenForParent(db, user.id),
    listParentMessages(db, user.id, { studentId: ogrenciId, unreadOnly: true, limit: 3 }),
  ]);
  const { child, character, week, weekBalance, weekPositive, weekTop, recent, subjects, home, timeZone } = dashboard;
  const name = formatStudentName(child);
  // Characters in the child switcher tell siblings apart at a glance.
  const switcher = await withStages(db, children);

  if (hosgeldin) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col justify-center py-10">
        <div className="flex flex-col items-center gap-3 rounded-[2rem] bg-card p-8 text-center shadow-[0_4px_0_var(--kid-shadow)]">
          <CharacterAvatar stage={character.stage} size={160} />
          <h1 className="font-display text-3xl font-extrabold">{possessiveName(child.firstName)} bahçesine hoş geldiniz!</h1>
          <p className="text-muted-foreground">
            Hesabınız hazır. {possessiveName(child.firstName)} karakteri her olumlu davranışla büyüyecek.
          </p>
          <Link href={`/veli/${child.id}`} className={primaryAction}>
            Panele git
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <ChildSwitcher items={switcher} currentId={child.id} />
      <IosInstallGuide variant="banner" />

      <h1 className="font-display text-3xl font-extrabold">{name}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <CharacterHero childName={name} className={child.className} character={character} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Bu hafta
              {weekPositive > 0 && (
                <span className="rounded-full bg-grass-soft px-3 py-1 text-sm font-extrabold text-grass-strong">
                  +{weekPositive} olumlu
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Son 7 günün davranış dengesi:{" "}
              <span className={cn("font-semibold", weekBalance >= 0 ? "text-grass-strong" : "text-coral-ink")}>
                {weekBalance > 0 ? `+${weekBalance}` : weekBalance}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <WeekChart days={week} />
            {weekTop && (
              <p className="rounded-xl bg-sun-soft px-3 py-2 text-sm">
                En çok:{" "}
                <strong>
                  <span aria-hidden>{weekTop.icon} </span>
                  {weekTop.name}
                </strong>{" "}
                ({weekTop.count} kez)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="home-title" className="flex flex-col gap-3">
        <div>
          <h2 id="home-title" className="font-display text-2xl font-extrabold">
            Evde bugün
          </h2>
          <p className="text-muted-foreground">
            {child.firstName} ile birlikte dokunun — {characterNoun(character.stage.assetUrl)} sevinsin! Hemen kaydedilir.
          </p>
        </div>
        <HomeEntry
          studentId={child.id}
          childName={child.firstName}
          types={home.types}
          todayXp={home.todayXp}
          cap={home.cap}
          todayCounts={home.todayCounts}
          disabled={!child.active}
        />
      </section>

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
              <CardTitle>Macera haritası</CardTitle>
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
                          className="h-full rounded-full bg-grass"
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
                Macera haritasını aç
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-5" aria-hidden />
                Öğretmenden
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
