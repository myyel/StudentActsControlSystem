import { Megaphone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { REACTIONS, formatMessageDate } from "@/lib/messages";
import type { ClassMessage } from "@/server/services/message";
import { DeleteMessageButton } from "./delete-message-button";

/** Teacher view: each message with who read it and how they reacted (current recipients). */
export function ClassMessageList({ items }: { items: ClassMessage[] }) {
  if (items.length === 0) return <p className="text-muted-foreground">Henüz mesaj gönderilmedi.</p>;

  return (
    <ul className="flex flex-col gap-4">
      {items.map((m) => (
        <li key={m.id} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            {m.studentName ? (
              <Badge variant="secondary">
                <User aria-hidden /> {m.studentName}
              </Badge>
            ) : (
              <Badge variant="outline">
                <Megaphone aria-hidden /> Duyuru
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {formatMessageDate(m.createdAt)}
              {m.authorName && ` · ${m.authorName}`}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold break-words">{m.title}</h3>
            <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
          </div>

          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 rounded-md text-sm font-medium hover:underline">
              <span>
                {m.readers.length === 0
                  ? "Bağlı veli yok"
                  : `${m.readCount}/${m.readers.length} veli okudu`}
              </span>
              {(Object.keys(REACTIONS) as (keyof typeof REACTIONS)[]).map((r) => (
                <span key={r} aria-label={`${REACTIONS[r].label}: ${m.reactions[r]}`}>
                  <span aria-hidden>{REACTIONS[r].emoji}</span> {m.reactions[r]}
                </span>
              ))}
              {m.readers.length > 0 && (
                <span className="text-muted-foreground group-open:hidden">Kim okudu?</span>
              )}
            </summary>
            {m.readers.length > 0 && (
              <ul className="mt-2 flex flex-col divide-y text-sm">
                {m.readers.map((r) => (
                  <li key={r.parentId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0 break-words">
                      {r.parentName}
                      <span className="text-muted-foreground"> · {r.children.join(", ")}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {r.reaction && (
                        <span title={REACTIONS[r.reaction].label}>
                          <span aria-hidden>{REACTIONS[r.reaction].emoji}</span>
                          <span className="sr-only">{REACTIONS[r.reaction].label}</span>
                        </span>
                      )}
                      {r.readAt ? (
                        <span className="text-emerald-700 dark:text-emerald-400">Okudu · {formatMessageDate(r.readAt)}</span>
                      ) : (
                        <span className="text-muted-foreground">Okumadı</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <div className="flex justify-end">
            <DeleteMessageButton messageId={m.id} title={m.title} />
          </div>
        </li>
      ))}
    </ul>
  );
}
