import { Megaphone, User } from "lucide-react";
import Link from "next/link";
import { REACTIONS, formatMessageDate } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { ParentMessage } from "@/server/services/message";

/** A parent's messages; unread ones are bold with a dot. */
export function ParentMessageList({ items, empty }: { items: ParentMessage[]; empty: string }) {
  if (items.length === 0) return <p className="text-muted-foreground">{empty}</p>;

  return (
    <ul className="flex flex-col divide-y">
      {items.map((m) => {
        const unread = !m.readAt;
        return (
          <li key={m.id}>
            <Link
              href={`/veli/mesajlar/${m.id}`}
              className="flex min-h-11 items-start gap-3 rounded-md px-1 py-3 hover:bg-accent"
            >
              <span className="mt-0.5 text-muted-foreground" aria-hidden>
                {m.studentName ? <User className="size-5" /> : <Megaphone className="size-5" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn("break-words", unread && "font-semibold")}>
                  {unread && <span className="sr-only">Okunmadı: </span>}
                  {m.title}
                </span>
                <span className="line-clamp-2 text-sm break-words text-muted-foreground">{m.body}</span>
                <span className="text-xs text-muted-foreground">
                  {m.studentName ? `${m.studentName} için` : `${m.className} duyurusu`} · {formatMessageDate(m.createdAt)}
                  {m.reaction && ` · ${REACTIONS[m.reaction].emoji} ${REACTIONS[m.reaction].label}`}
                </span>
              </span>
              {unread && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-red-600" aria-hidden />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
