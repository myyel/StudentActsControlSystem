import { redirect } from "next/navigation";
import { InviteCodeEntry } from "@/components/parents/invite-code-entry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listChildrenForParent } from "@/server/services/parent";

export default async function ParentHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  const { user } = await requirePageRole("parent");
  const children = await listChildrenForParent(db, user.id);
  if (children.length > 0) redirect(`/veli/${children[0]!.id}`);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Hoş geldiniz</h1>
      <Card>
        <CardHeader>
          <CardTitle>Çocuğunuzu ekleyin</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground">Hesabınıza bağlı çocuk yok. Öğretmeninizden aldığınız kodu girin.</p>
          <InviteCodeEntry />
        </CardContent>
      </Card>
    </div>
  );
}
