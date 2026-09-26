import { requirePageRole } from "@/server/auth/session";

export default async function TeacherHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  await requirePageRole("teacher");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Sınıflarım</h1>
      <p className="text-muted-foreground">Sınıflarınız ve öğrencileriniz burada listelenecek.</p>
    </div>
  );
}
