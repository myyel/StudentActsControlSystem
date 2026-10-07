import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MapIcon, MessageCircleHeart, Star } from "lucide-react";
import { LogoMark, STAR_PATH } from "@/components/app-icon";
import { CharacterImage } from "@/components/characters/character-image";
import { stageAssetUrl } from "@/content/characters";
import { ROLE_HOME } from "@/lib/roles";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { cn } from "@/lib/utils";
import { getSession } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

const CHARACTERS: { slug: string; level: number; delay: string }[] = [
  { slug: "ejderha", level: 3, delay: "[animation-delay:0ms]" },
  { slug: "baykus", level: 3, delay: "[animation-delay:400ms]" },
  { slug: "robot", level: 3, delay: "[animation-delay:800ms]" },
  { slug: "tohum", level: 3, delay: "[animation-delay:1200ms]" },
];

const FEATURES = [
  { icon: Star, label: "Davranış yıldızları", tone: "bg-sun-soft text-ink" },
  { icon: MapIcon, label: "Macera haritası", tone: "bg-sky-soft text-sky-ink" },
  { icon: MessageCircleHeart, label: "Veliyle iletişim", tone: "bg-lav-soft text-lav-ink" },
];

export default async function LoginPage({ searchParams }: PageProps<"/giris">) {
  const { next, hesap } = await searchParams;
  const nextPath = safeRedirectPath(typeof next === "string" ? next : null);

  const session = await getSession();
  if (session) redirect(nextPath ?? ROLE_HOME[session.user.role]);

  return (
    <main data-surface="kid" className="relative flex flex-1 flex-col overflow-hidden">
      <Decorations />
      <div className="relative mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-6 px-4 py-8 sm:gap-8 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8">
        <section className="flex flex-col items-center gap-4 text-center lg:items-start lg:gap-6 lg:text-left">
          <ul className="flex items-end justify-center gap-1 sm:gap-3 lg:order-last lg:justify-start" aria-hidden>
            {CHARACTERS.map(({ slug, level, delay }) => (
              <li key={slug} className={cn("motion-safe:animate-float", delay)}>
                <CharacterImage
                  stage={{ name: "", assetUrl: stageAssetUrl(slug, level) }}
                  size={112}
                  decorative
                  className="size-18 drop-shadow-md sm:size-24 xl:size-28"
                />
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <p className="flex items-center justify-center gap-2 font-display text-lg font-extrabold text-grass-strong sm:text-xl lg:justify-start">
              <LogoMark tile aria-hidden className="size-10 shrink-0" />
              Gelişim Yolculuğu
            </p>
            <h1 className="font-display text-3xl leading-tight font-extrabold sm:text-4xl xl:text-5xl">
              Her gün bir adım ileri!
            </h1>
            <p className="mx-auto max-w-md text-muted-foreground sm:text-lg lg:mx-0">
              Öğretmen, veli ve çocuk birlikte: iyi davranışları kutlayın, öğrenme yolculuğunu adım adım izleyin.
            </p>
          </div>
          <ul className="hidden flex-wrap justify-center gap-2 sm:flex lg:justify-start">
            {FEATURES.map(({ icon: Icon, label, tone }) => (
              <li key={label} className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold", tone)}>
                <Icon className="size-4" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex w-full flex-col items-center gap-4 lg:items-end">
          {hesap === "silindi" && (
            <p role="status" className="kid-card w-full max-w-sm p-4 text-sm">
              Hesabınız silindi. Uygulamayı kullandığınız için teşekkür ederiz.
            </p>
          )}
          <LoginForm next={nextPath} />
        </div>
      </div>
    </main>
  );
}

/** Clouds and twinkling stars; purely decorative. */
function Decorations() {
  const stars = [
    "left-[8%] top-[10%] size-6 text-sun",
    "right-[12%] top-[6%] size-8 text-sun [animation-delay:700ms]",
    "left-[46%] top-[4%] size-4 text-lav [animation-delay:1300ms]",
    "right-[6%] top-[42%] hidden size-5 text-sky lg:block [animation-delay:400ms]",
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Cloud className="absolute top-[7%] -left-6 w-28 sm:w-40" />
      <Cloud className="absolute top-[18%] -right-8 w-32 opacity-80 sm:w-48" />
      <Cloud className="absolute top-[78%] left-[4%] hidden w-36 opacity-70 lg:block" />
      {stars.map((cls) => (
        <svg key={cls} viewBox="0 0 24 24" className={cn("absolute fill-current motion-safe:animate-twinkle", cls)}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 50" className={className}>
      <path
        fill="#fff"
        d="M18 46 C4 46 2 30 14 27 C12 14 30 8 38 18 C44 4 70 2 76 18 C86 10 104 14 102 28 C116 28 118 46 104 46Z"
      />
    </svg>
  );
}
