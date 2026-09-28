import type { Metadata } from "next";
import Link from "next/link";
import { ParentMessageList } from "@/components/messages/parent-message-list";
import { Card, CardContent } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listParentMessages } from "@/server/services/message";
import { listChildrenForParent } from "@/server/services/parent";

export const metadata: Metadata = { title: "Mesajlar" };

export default async function ParentMessagesPage({ searchParams }: PageProps<"/veli/mesajlar">) {
  const { user } = await requirePageRole("parent");
  const { cocuk } = await searchParams;
  const children = await listChildrenForParent(db, user.id);
  // Only the parent's own children are valid filters; anything else shows all.
  const child = children.find((c) => c.id === cocuk);
  const messages = await listParentMessages(db, user.id, { studentId: child?.id });

  const filters = [
    { key: "all", label: "Tümü", href: "/veli/mesajlar", active: !child },
    ...children.map((c) => ({
      key: c.id,
      label: formatStudentName(c),
      href: `/veli/mesajlar?cocuk=${c.id}`,
      active: child?.id === c.id,
    })),
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mesajlar</h1>
      {children.length > 1 && (
        <nav aria-label="Çocuğa göre" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.href}
              aria-current={f.active ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center rounded-full border px-4 font-medium transition-colors",
                f.active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      )}
      <Card>
        <CardContent>
          <ParentMessageList items={messages} empty="Henüz mesaj yok. Öğretmenin duyuruları burada görünecek." />
        </CardContent>
      </Card>
    </div>
  );
}
