"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { AgencyLite } from "@/lib/types";

const NAV_LINKS = [
  { label: "Vente", href: "/biens?transaction=sale" },
  { label: "Location", href: "/biens?transaction=rent" },
  { label: "Carte", href: "/carte" },
  { label: "Estimation", href: "#" },
  { label: "Gestion", href: "#" },
];

export function LandingNavbar({ agencies }: { agencies: AgencyLite[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Solid style once scrolled OR when the mobile sheet is open.
  const solid = scrolled || mobileOpen;

  // Over the hero image → light text; when solid → theme-aware foreground.
  const navLinkClass = cn(
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    solid
      ? "text-foreground/80 hover:text-primary"
      : "text-white/90 hover:text-white",
  );

  return (
    <header
      dir="ltr"
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        solid
          ? "border-b border-border bg-card/95 backdrop-blur"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo — far left */}
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Immo DZ" className="h-9 w-auto" />
          <span
            className={cn(
              "text-lg font-bold tracking-tight transition-colors",
              solid ? "text-foreground" : "text-white",
            )}
          >
            Immo<span className="text-primary"> DZ</span>
          </span>
        </Link>

        {/* Center links — desktop */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={navLinkClass}>
              {link.label}
            </Link>
          ))}

          {/* Agences dropdown */}
          <div className="group relative">
            <button type="button" className={cn(navLinkClass, "flex items-center gap-1")}>
              Agences
              <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute right-0 top-full min-w-56 rounded-lg border border-border bg-card p-1.5 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
              {agencies.length > 0 ? (
                agencies.map((agency) => (
                  <Link
                    key={agency.id}
                    href={`/agences/${agency.id}`}
                    className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary hover:text-primary"
                  >
                    {agency.name}
                    <span className="mr-1 text-xs text-muted-foreground">
                      · {agency.wilaya}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  لا توجد وكالات بعد
                </p>
              )}
            </div>
          </div>

          <Link href="#" className={navLinkClass}>
            Actualités
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <a href="#contact" className={cn(navLinkClass, "hidden sm:inline")}>
            Nous contacter
          </a>
          <ThemeToggle
            className={cn(
              solid
                ? "text-foreground hover:bg-secondary"
                : "text-white hover:bg-white/10",
            )}
          />
          <Link
            href="/login"
            className="hidden h-9 items-center justify-center rounded-md border border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:inline-flex"
          >
            Connexion
          </Link>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="القائمة"
            className={cn(
              "flex size-9 items-center justify-center rounded-md lg:hidden",
              solid ? "text-foreground" : "text-white",
            )}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="border-t border-border bg-card lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            <p className="px-3 pt-2 text-xs font-semibold uppercase text-muted-foreground">
              Agences
            </p>
            {agencies.map((agency) => (
              <Link
                key={agency.id}
                href={`/agences/${agency.id}`}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary"
              >
                {agency.name}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
              >
                Nous contacter
              </a>
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "sm" }), "flex-1")}
              >
                Connexion
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
