"use client";

import { useActionState, useMemo, useState } from "react";
import { bulkAddStudentsAction } from "@/app/ogretmen/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GradeLevelSelect } from "./grade-level-select";
import { formatStudentName, MAX_BULK_STUDENTS, parseStudentLines } from "@/lib/student-names";

export function BulkAddForm({ classId, gradeLevels }: { classId: string; gradeLevels: number[] }) {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await bulkAddStudentsAction(classId, prev, formData);
    if (result.ok) setText("");
    return result;
  }, null);

  const lines = useMemo(() => parseStudentLines(text), [text]);
  const valid = lines.filter((l) => l.ok);
  const invalid = lines.filter((l) => !l.ok);
  const tooMany = valid.length > MAX_BULK_STUDENTS;
  const canSubmit = valid.length > 0 && invalid.length === 0 && !tooMany;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="bulk-names">Her satıra bir öğrenci</Label>
        <Textarea
          id="bulk-names"
          name="names"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Ada Yılmaz\nAli Can Demir\nElif K."}
        />
        <p className="text-sm text-muted-foreground">
          Soyadının yalnızca baş harfi saklanır. Listeden kopyalanan numaralar (&quot;1.&quot;) yok sayılır.
        </p>
      </div>

      <GradeLevelSelect id="bulk-grade" gradeLevels={gradeLevels} label="Bu öğrencilerin düzeyi" />

      {lines.length > 0 && (
        <div className="rounded-md border p-3 text-sm" aria-live="polite">
          <p className="mb-2 font-medium">
            Önizleme: {valid.length} öğrenci
            {tooMany && <span className="text-destructive"> (en fazla {MAX_BULK_STUDENTS})</span>}
          </p>
          <ul className="flex flex-wrap gap-2">
            {lines.map((l) =>
              l.ok ? (
                <li key={l.line} className="rounded bg-muted px-2 py-1">
                  {formatStudentName(l.value)}
                </li>
              ) : (
                <li key={l.line} className="rounded bg-destructive/10 px-2 py-1 text-destructive">
                  {l.line}. satır: {l.error}
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      <Button type="submit" disabled={pending || !canSubmit} className="h-11 self-start">
        {pending ? "Ekleniyor…" : `${valid.length || ""} öğrenciyi ekle`.trim()}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
