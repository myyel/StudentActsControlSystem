import { requirePageRole } from "@/server/auth/session";

export default async function ParentHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  await requirePageRole("parent");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Çocuğum</h1>
      <p className="text-muted-foreground">Çocuğunuzun gelişimi burada görünecek.</p>
    </div>
  );
}
