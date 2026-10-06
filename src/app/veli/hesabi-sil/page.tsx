import type { Metadata } from "next";
import { DeleteAccountForm } from "@/components/privacy/delete-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listChildrenForParent } from "@/server/services/parent";
import { listPendingRequestsForParent } from "@/server/services/privacy";

export const metadata: Metadata = { title: "Hesabı sil" };

export default async function DeleteAccountPage() {
  const { user } = await requirePageRole("parent");
  const [children, pending] = await Promise.all([
    listChildrenForParent(db, user.id),
    listPendingRequestsForParent(db, user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Hesabı sil</CardTitle>
          <CardDescription>
            Hesabınız, çocuklarınızla bağlantınız, bildirimleriniz ve cihaz abonelikleriniz hemen ve kalıcı olarak
            silinir. Bu işlem geri alınamaz. Verdiğiniz KVKK onaylarının kaydı, yasal ispat için adınız olmadan
            saklanır. Önce{" "}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from a route handler; <Link> would prefetch it */}
            <a href="/veli/disa-aktar?bicim=json" className="underline underline-offset-2">
              verilerinizi indirebilirsiniz
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm
            childList={children.map((c) => ({ id: c.id, name: formatStudentName(c), pending: pending.has(c.id) }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
