import { cn } from "@/lib/utils";
import { adminCardClass, type AdminSection } from "./admin-sections";

/** Coloured banner with the section's icon, matching its tile on the admin home; the way back is in the app header. */
export function AdminPageHeader({ section, children }: { section: AdminSection; children?: React.ReactNode }) {
  const Icon = section.icon;
  return (
    <header className={cn(adminCardClass, "flex items-center gap-4 p-4 sm:p-5", section.tone.band)}>
      <span
        aria-hidden
        className={cn(
          "flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_3px_0_rgb(0_0_0/0.12)] sm:size-16",
          section.tone.badge,
        )}
      >
        <Icon className="size-7 sm:size-8" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{section.title}</h1>
        {children && <div className="text-sm text-muted-foreground sm:text-base">{children}</div>}
      </div>
    </header>
  );
}

/** Heading of a block inside an admin page. */
export function AdminSectionTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-2xl font-extrabold">{title}</h2>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}
