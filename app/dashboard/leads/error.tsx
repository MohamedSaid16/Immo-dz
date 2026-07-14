"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[crm:route]", {
      digest: error.digest ?? "unavailable",
    });
  }, [error.digest]);

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <h1 className="text-lg font-bold">تعذّر تحميل بيانات العملاء</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى إعادة المحاولة.
      </p>
      <Button onClick={reset} variant="outline" className="mt-5 gap-2">
        <RotateCcw className="size-4" />
        إعادة المحاولة
      </Button>
    </div>
  );
}
