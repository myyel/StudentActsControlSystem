import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EXPLICIT_CONSENT, KVKK_DOC_VERSION, PRIVACY_NOTICE } from "@/content/kvkk";

const DOCUMENTS = { aydinlatma: PRIVACY_NOTICE, "acik-riza": EXPLICIT_CONSENT } as const;

export function generateStaticParams() {
  return Object.keys(DOCUMENTS).map((belge) => ({ belge }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/kvkk/[belge]">): Promise<Metadata> {
  const doc = DOCUMENTS[(await params).belge as keyof typeof DOCUMENTS];
  return { title: doc?.title };
}

export default async function KvkkPage({ params }: PageProps<"/kvkk/[belge]">) {
  const doc = DOCUMENTS[(await params).belge as keyof typeof DOCUMENTS];
  if (!doc) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <p className="rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        TASLAK — hukuki inceleme gerekli. Pilot öncesi okulun onaylı metniyle değiştirilecektir.
      </p>
      <h1 className="text-2xl font-semibold">{doc.title}</h1>
      {doc.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
      <p className="text-sm text-muted-foreground">Metin sürümü: {KVKK_DOC_VERSION}</p>
    </main>
  );
}
