import { Megaphone, User } from "lucide-react";
import type { Metadata } from "next";
import { MessageReactions } from "@/components/messages/message-reactions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMessageDate } from "@/lib/messages";
import { db } from "@/server/db";
import { assertParentOfMessage } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getParentMessage } from "@/server/services/message";

export const metadata: Metadata = { title: "Mesaj" };

export default async function ParentMessagePage({ params }: PageProps<"/veli/mesajlar/[mesajId]">) {
  const { mesajId } = await params;
  const { user } = await requirePageRole("parent");
  // Another child's message renders 404, like a missing one.
  await orNotFound(assertParentOfMessage(user, mesajId));
  const message = await orNotFound(getParentMessage(db, user.id, mesajId));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {message.studentName ? (
              <Badge variant="secondary">
                <User aria-hidden /> {message.studentName} için
              </Badge>
            ) : (
              <Badge variant="outline">
                <Megaphone aria-hidden /> {message.className} duyurusu
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">{formatMessageDate(message.createdAt)}</span>
          </div>
          <CardTitle className="text-xl break-words">
            <h1>{message.title}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          <MessageReactions messageId={message.id} read={Boolean(message.readAt)} reaction={message.reaction} />
        </CardContent>
      </Card>
    </div>
  );
}
