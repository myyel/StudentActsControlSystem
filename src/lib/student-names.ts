export const MAX_BULK_STUDENTS = 60;
export const MAX_FIRST_NAME_LENGTH = 50;

export type StudentName = { firstName: string; lastInitial: string | null };

export type ParsedLine =
  | { line: number; ok: true; value: StudentName }
  | { line: number; ok: false; raw: string; error: string };

const capitalize = (word: string) =>
  word.charAt(0).toLocaleUpperCase("tr") + word.slice(1);

/**
 * "Ada Yılmaz" → Ada Y., "Ali Can Yılmaz" → Ali Can Y., "Ada Y." → Ada Y., "Ada" → Ada.
 * Only the surname's initial is kept (data minimization). Leading list numbers ("1. ", "2) ") are ignored.
 */
export function parseStudentName(raw: string): StudentName | null {
  const cleaned = raw.replace(/^\s*\d+\s*[.)-]?\s+/, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  if (words.length === 1) return { firstName: capitalize(words[0]!), lastInitial: null };

  const surname = words.at(-1)!.replace(/[^\p{L}]/gu, "");
  const firstName = words.slice(0, -1).map(capitalize).join(" ");
  const lastInitial = surname.charAt(0).toLocaleUpperCase("tr") || null;
  return { firstName, lastInitial };
}

export function validateStudentName(name: StudentName): string | null {
  if (name.firstName.length > MAX_FIRST_NAME_LENGTH) {
    return `Ad en fazla ${MAX_FIRST_NAME_LENGTH} karakter olabilir.`;
  }
  if (!/\p{L}/u.test(name.firstName)) return "Ad en az bir harf içermeli.";
  return null;
}

/** One student per non-empty line. */
export function parseStudentLines(text: string): ParsedLine[] {
  const results: ParsedLine[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const value = parseStudentName(raw);
    if (!value) return;
    const error = validateStudentName(value);
    results.push(
      error ? { line: index + 1, ok: false, raw: raw.trim(), error } : { line: index + 1, ok: true, value },
    );
  });
  return results;
}

export const formatStudentName = ({ firstName, lastInitial }: StudentName) =>
  lastInitial ? `${firstName} ${lastInitial}.` : firstName;

const BACK_VOWELS: Record<string, string> = { a: "ı", ı: "ı", o: "u", u: "u", e: "i", i: "i", ö: "ü", ü: "ü" };

/** Genitive with Turkish vowel harmony: Deniz'in, Ada'nın, Umut'un, Göktuğ'un, Ali'nin. */
export function possessiveName(name: string) {
  const lower = name.toLocaleLowerCase("tr");
  const vowels = [...lower].filter((ch) => ch in BACK_VOWELS);
  const vowel = BACK_VOWELS[vowels.at(-1) ?? "e"]!;
  const endsWithVowel = (lower.at(-1) ?? "") in BACK_VOWELS;
  return `${name}'${endsWithVowel ? "n" : ""}${vowel}n`;
}
