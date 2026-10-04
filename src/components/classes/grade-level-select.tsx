import { selectClassName } from "@/components/form-message";
import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  /** The class's levels; nothing is rendered for a single-level class (the server fills it in). */
  gradeLevels: number[];
  defaultValue?: number | null;
  label?: string;
  /** Subjects may be for every grade. */
  allOption?: string;
};

/** Grade picker for combined (birleştirilmiş) classes. */
export function GradeLevelSelect({ id, gradeLevels, defaultValue, label = "Sınıf düzeyi", allOption }: Props) {
  if (gradeLevels.length < 2) return null;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name="gradeLevel"
        required={!allOption}
        defaultValue={defaultValue ?? ""}
        className={selectClassName}
      >
        {allOption ? <option value="">{allOption}</option> : <option value="" disabled>Seçin</option>}
        {gradeLevels.map((g) => (
          <option key={g} value={g}>
            {g}. sınıf
          </option>
        ))}
      </select>
    </div>
  );
}
