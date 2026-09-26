import { selectClassName } from "@/components/form-message";
import { Label } from "@/components/ui/label";
import { INVITE_VALIDITY_OPTIONS } from "@/lib/invite-code";

/** Shared fields; defaults follow the product decision: single-use, 14 days. */
export function InviteOptionsFields({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-validity`}>Geçerlilik</Label>
        <select id={`${idPrefix}-validity`} name="validity" defaultValue="14" className={selectClassName}>
          {INVITE_VALIDITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="singleUse" defaultChecked className="size-5" />
        <span>Tek kullanımlık (her veli için ayrı kod)</span>
      </label>
    </>
  );
}
