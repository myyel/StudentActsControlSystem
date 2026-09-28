import type { Metadata } from "next";
import { BackLink } from "@/components/layout/back-link";
import { InviteCodeEntry } from "@/components/parents/invite-code-entry";
import { Card, CardContent } from "@/components/ui/card";
import { requirePageRole } from "@/server/auth/session";

export const metadata: Metadata = { title: "Çocuk ekle" };

export default async function AddChildPage() {
  await requirePageRole("parent");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <BackLink href="/veli">Panele dön</BackLink>
        <h1 className="text-2xl font-semibold">Çocuk ekle</h1>
        <p className="text-muted-foreground">Öğretmenden aldığınız davet kodunu girin; çocuk hesabınıza eklenir.</p>
      </div>
      <Card>
        <CardContent>
          <InviteCodeEntry />
        </CardContent>
      </Card>
    </div>
  );
}
