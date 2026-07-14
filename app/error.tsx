"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app:error]", { digest: error.digest ?? "unavailable" });
  }, [error.digest]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Brand />
      <p className="text-6xl font-extrabold text-destructive">500</p>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">
          حدث خطأ ما · Une erreur est survenue
        </h1>
        <p className="text-sm text-muted-foreground">
          نعتذر عن ذلك. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} className="gap-2">
          <RotateCcw className="size-4" />
          إعادة المحاولة
        </Button>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <Home className="size-4" />
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
