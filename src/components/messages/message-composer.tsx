"use client";

import { useActionState, useRef } from "react";
import { sendMessageAction } from "@/app/ogretmen/message-actions";
import { FormMessage, selectClassName } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGE_BODY_MAX, MESSAGE_TITLE_MAX } from "@/lib/messages";

type Student = { id: string; name: string; parentCount: number };

export function MessageComposer({
  classId,
  students,
  defaultStudentId,
}: {
  classId: string;
  students: Student[];
  defaultStudentId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const result = await sendMessageAction(classId, {
      studentId: formData.get("studentId"),
      title: formData.get("title"),
      body: formData.get("body"),
    });
    if (result.ok) formRef.current?.reset();
    return result;
  }, null);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="message-audience">Kime</Label>
        <select
          id="message-audience"
          name="studentId"
          defaultValue={defaultStudentId ?? ""}
          className={selectClassName}
        >
          <option value="">Tüm sınıf (duyuru)</option>
          <optgroup label="Öğrencinin velilerine">
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.parentCount === 0 ? " (bağlı veli yok)" : ""}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="message-title">Başlık</Label>
        <Input id="message-title" name="title" required maxLength={MESSAGE_TITLE_MAX} className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="message-body">Mesaj</Label>
        <Textarea id="message-body" name="body" required maxLength={MESSAGE_BODY_MAX} rows={5} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? "Gönderiliyor…" : "Gönder"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
