import Link from "next/link";
import { selectClassName } from "@/components/form-message";
import { Label } from "@/components/ui/label";
import { RELATION_LABEL } from "@/lib/relations";

export function RelationField() {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="relation">Çocuğunuzla yakınlığınız</Label>
      <select id="relation" name="relation" required defaultValue="" className={selectClassName}>
        <option value="" disabled>
          Seçin
        </option>
        {Object.entries(RELATION_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Both boxes are required (product decision); each opens its text in a new tab. */
export function ConsentFields() {
  const link = "font-medium underline underline-offset-2";
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">KVKK</legend>
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="privacyNotice" required className="mt-1 size-5 shrink-0" />
        <span className="text-sm">
          <Link href="/kvkk/aydinlatma" target="_blank" className={link}>
            Aydınlatma metnini
          </Link>{" "}
          okudum.
        </span>
      </label>
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="explicitConsent" required className="mt-1 size-5 shrink-0" />
        <span className="text-sm">
          Çocuğumun verilerinin işlenmesine{" "}
          <Link href="/kvkk/acik-riza" target="_blank" className={link}>
            açık rıza metni
          </Link>{" "}
          kapsamında onay veriyorum.
        </span>
      </label>
    </fieldset>
  );
}
