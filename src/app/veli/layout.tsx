import { AppShell } from "@/components/layout/app-shell";
import { ParentNav } from "@/components/notifications/parent-nav";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { countUnreadMessages } from "@/server/services/message";
import { countUnreadNotifications } from "@/server/services/notification";

export default async function ParentLayout({ children }: LayoutProps<"/veli">) {
  const { user } = await requirePageRole("parent");
  const [notifications, messages] = await Promise.all([
    countUnreadNotifications(db, user.id),
    countUnreadMessages(db, user.id),
  ]);
  return (
    <AppShell user={user} nav={<ParentNav initial={{ notifications, messages }} />}>
      {children}
    </AppShell>
  );
}
