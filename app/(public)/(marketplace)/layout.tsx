import Link from "next/link";
import { Map, Search } from "lucide-react";

import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/landing/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Brand />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/biens"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5",
              )}
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">Rechercher</span>
              <span className="sm:hidden">بحث</span>
            </Link>
            <Link
              href="/carte"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5",
              )}
            >
              <Map className="size-4" />
              <span className="hidden sm:inline">Carte</span>
            </Link>
            <ThemeToggle />
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              Espace agence
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
}
