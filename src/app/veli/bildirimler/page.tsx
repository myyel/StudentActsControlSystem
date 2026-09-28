import type { Metadata } from "next";
import Link from "next/link";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMessageDate } from "@/lib/messages";
import { NOTIFICATION_TYPES } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listNotifications } from "@/server/services/notification";

export const metadata: Metadata = { title: "Bildirimler" };

export default async function NotificationsPage() {
  const { user } = await requirePageRole("parent");
  const items = await listNotifications(db, user.id);
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Bildirimler</h1>
        {hasUnread && <MarkAllReadButton />}
      </div>
      <Card>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground">Henüz bildirim yok.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {items.map((n) => {
                const unread = !n.readAt;
                return (
                  <li key={n.id}>
                    {/* Full navigation through the route that marks it read, like a push notification. */}
                    <a
                      href={`/bildirim/${n.id}`}
                      className="flex min-h-11 items-start gap-3 rounded-md px-1 py-3 hover:bg-accent"
                    >
                      <span className="text-2xl" aria-hidden>
                        {NOTIFICATION_TYPES[n.type].icon}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("break-words", unread && "font-semibold")}>
                          {unread && <span className="sr-only">Yeni: </span>}
                          {n.payload.title}
                        </span>
                        <span className="text-sm break-words text-muted-foreground">{n.payload.body}</span>
                        <span className="text-xs text-muted-foreground">{formatMessageDate(n.createdAt)}</span>
                      </span>
                      {unread && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-red-600" aria-hidden />}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Hangi bildirimleri alacağınızı{" "}
        <Link href="/veli/ayarlar" className="font-medium underline">
          Ayarlar
        </Link>{" "}
        sayfasından seçebilirsiniz.
      </p>
    </div>
  );
}
