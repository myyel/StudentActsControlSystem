"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Unexpected errors, including a navigation that fails because the connection dropped.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlert className="size-16 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold">Bir sorun oluştu</h1>
      <p className="max-w-sm text-muted-foreground">
        Sayfa yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.
      </p>
      <Button className="h-11 px-6" onClick={() => retry()}>
        Tekrar dene
      </Button>
    </main>
  );
}
