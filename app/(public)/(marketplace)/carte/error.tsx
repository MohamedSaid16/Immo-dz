"use client";

import { useEffect } from "react";
import { MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function CarteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[map:error]", { digest: error.digest ?? "unavailable" });
  }, [error.digest]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <MapPinOff className="size-7" />
      </span>
      <div>
        <p className="font-semibold text-foreground">
          تعذّر تحميل الخريطة · La carte n&apos;a pas pu se charger
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          يرجى المحاولة مرة أخرى.
        </p>
      </div>
      <Button onClick={reset}>إعادة المحاولة</Button>
    </div>
  );
}
