import { requirePageRole } from "@/server/auth/session";

export default async function AdminHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  await requirePageRole("admin");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Yönetim paneli</h1>
      <p className="text-muted-foreground">Okul ayarları ve öğretmen hesapları burada yönetilecek.</p>
    </div>
  );
}
