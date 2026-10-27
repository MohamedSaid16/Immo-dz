"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import type { AgencyLite } from "@/lib/types";

const NAV_LINKS = [
  ["الرئيسية", "/"],
  ["العقارات", "/biens"],
  ["للبيع", "/biens?transaction=sale"],
  ["للإيجار", "/biens?transaction=rent"],
  ["الخريطة", "/carte"],
  ["اتصل بنا", "#contact"],
] as const;

export function LandingNavbar({ agencies }: { agencies: AgencyLite[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header dir="rtl" className="relative z-50 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Immo DZ الرئيسية">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Immo DZ" className="h-9 w-auto" />
          <span className="text-lg font-extrabold tracking-tight text-foreground">Immo<span className="text-primary"> DZ</span></span>
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="التنقل الرئيسي">
          {NAV_LINKS.slice(0, 5).map(([label, href]) => <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground">{label}</Link>)}
          <div className="group relative"><button type="button" className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-foreground/75 hover:bg-secondary hover:text-foreground">الوكالات <ChevronDown className="size-3.5" aria-hidden="true" /></button><div className="invisible absolute right-0 top-full min-w-56 rounded-lg border border-border bg-card p-1.5 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">{agencies.length > 0 ? agencies.slice(0, 8).map((agency) => <Link key={agency.id} href={`/agences/${agency.id}`} className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary">{agency.name}<span className="mr-1 text-xs text-muted-foreground">· {agency.wilaya}</span></Link>) : <p className="px-3 py-2 text-sm text-muted-foreground">لا توجد وكالات بعد</p>}</div></div>
          <Link href="#contact" className="rounded-md px-3 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground">اتصل بنا</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle className="text-foreground hover:bg-secondary" />
          <Link href="/login" className="hidden rounded-md border border-[#999999] px-4 py-2 text-sm font-bold text-[#111111] transition-colors hover:border-[#111111] hover:bg-[#111111] hover:text-white sm:inline-flex">فضاء الوكالات</Link>
          <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-label="القائمة" className="flex size-9 items-center justify-center rounded-md text-foreground lg:hidden">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      {mobileOpen && <nav className="border-t border-border bg-card px-4 py-3 lg:hidden" aria-label="التنقل على الهاتف"><div className="mx-auto flex max-w-[1400px] flex-col gap-1">{NAV_LINKS.map(([label, href]) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">{label}</Link>)}<p className="px-3 pt-2 text-xs font-bold text-muted-foreground">الوكالات</p>{agencies.slice(0, 8).map((agency) => <Link key={agency.id} href={`/agences/${agency.id}`} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary">{agency.name}</Link>)}<Link href="/login" onClick={() => setMobileOpen(false)} className="mt-2 rounded-md border border-[#999999] px-3 py-2.5 text-center text-sm font-bold text-[#111111]">فضاء الوكالات</Link></div></nav>}
    </header>
  );
}
