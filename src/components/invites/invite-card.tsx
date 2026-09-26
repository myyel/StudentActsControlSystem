import type { InviteCard as InviteCardData } from "@/app/ogretmen/actions";

/** Printable card: child's name, QR and the code for typing. */
export function InviteCard({ card }: { card: InviteCardData }) {
  return (
    <div className="flex break-inside-avoid flex-col items-center gap-2 rounded-xl border p-4 text-center">
      <p className="text-lg font-semibold">{card.studentName}</p>
      <div
        className="w-40 rounded bg-white p-1 [&_svg]:h-auto [&_svg]:w-full"
        role="img"
        aria-label={`${card.studentName} için davet QR kodu`}
        // SVG produced server-side by the qrcode library from our own URL.
        dangerouslySetInnerHTML={{ __html: card.qrSvg }}
      />
      <p className="font-mono text-2xl font-bold tracking-widest">{card.code}</p>
      <p className="text-xs break-all text-muted-foreground">{card.url}</p>
      <p className="text-xs text-muted-foreground">
        Kamerayla QR&apos;ı okutun veya adresi açıp kodu girin.
      </p>
    </div>
  );
}
