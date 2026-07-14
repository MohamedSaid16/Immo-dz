"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

import { NAV_ITEMS } from "./nav";
import { logout } from "./actions";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map(({ label, href, icon: Icon, soon }) => {
        const active =
          href === "/dashboard"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        if (soon) {
          return (
            <span
              key={href}
              aria-disabled
              className="flex cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/60"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-5" />
                {label}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                قريباً
              </span>
            </span>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-secondary",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Brand />
      </div>
      <NavList />
      <div className="border-t border-sidebar-border p-3">
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
          >
            <LogOut className="size-5" />
            تسجيل الخروج
          </Button>
        </form>
      </div>
    </div>
  );
}

export function DashboardShell({
  agencyName,
  children,
}: {
  agencyName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — fixed to the right edge (RTL) */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 border-l border-sidebar-border bg-sidebar lg:block">
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-72 border-l border-sidebar-border bg-sidebar shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute left-3 top-4 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              aria-label="إغلاق القائمة"
            >
              <X className="size-5" />
            </button>
            <SidebarInner />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:mr-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-md text-foreground hover:bg-secondary lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="size-5" />
            </button>
            <div className="lg:hidden">
              <Brand showText={false} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-left">
              <p className="text-sm font-semibold leading-tight text-foreground">
                {agencyName}
              </p>
              <p className="text-xs text-muted-foreground">مالك الوكالة</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {agencyName.charAt(0)}
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
