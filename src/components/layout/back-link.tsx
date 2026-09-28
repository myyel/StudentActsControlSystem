import Link from "next/link";

/** "← Parent page" link above a page title; 44px tall so it is an easy touch target. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 min-w-11 w-fit items-center text-sm text-muted-foreground hover:underline">
      ← {children}
    </Link>
  );
}
