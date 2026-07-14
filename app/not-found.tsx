import Link from "next/link";
import { Home, Search } from "lucide-react";

import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Brand />
      <p className="text-7xl font-extrabold text-primary">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">
          الصفحة غير موجودة · Page introuvable
        </h1>
        <p className="text-sm text-muted-foreground">
          عذرًا، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={cn(buttonVariants(), "gap-2")}>
          <Home className="size-4" />
          الرئيسية
        </Link>
        <Link
          href="/biens"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <Search className="size-4" />
          تصفّح العقارات
        </Link>
      </div>
    </div>
  );
}
