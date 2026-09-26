import { InviteCodeEntry } from "@/components/parents/invite-code-entry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RELATION_LABEL } from "@/lib/relations";
import { formatStudentName } from "@/lib/student-names";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listChildrenForParent } from "@/server/services/parent";

export default async function ParentHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  const { user } = await requirePageRole("parent");
  const children = await listChildrenForParent(db, user.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{children.length > 1 ? "Çocuklarım" : "Çocuğum"}</h1>

      {children.length === 0 ? (
        <p className="text-muted-foreground">Hesabınıza bağlı çocuk yok. Öğretmeninizden aldığınız kodu aşağıya girin.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {children.map((c) => (
            <li key={c.id} className="rounded-xl border p-4">
              <p className="text-lg font-semibold">{formatStudentName(c)}</p>
              <p className="text-sm text-muted-foreground">
                {c.className} · {RELATION_LABEL[c.relation]}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Çocuk ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteCodeEntry />
        </CardContent>
      </Card>
    </div>
  );
}
