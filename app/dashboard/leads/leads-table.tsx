"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ChevronDown,
  Eye,
  MessageCircle,
  Phone,
  Search,
} from "lucide-react";

import { updateStatusAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelative, telHref, waHref } from "@/lib/utils";
import {
  LEAD_PIPELINE,
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
  type Lead,
  type LeadStatus,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Filters                                                            */
/* ------------------------------------------------------------------ */

type FilterTab = "all" | LeadStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "new", label: LEAD_STATUS_LABELS.new.label },
  { key: "contacted", label: LEAD_STATUS_LABELS.contacted.label },
  { key: "visit_scheduled", label: LEAD_STATUS_LABELS.visit_scheduled.label },
  { key: "negotiating", label: LEAD_STATUS_LABELS.negotiating.label },
  { key: "converted", label: LEAD_STATUS_LABELS.converted.label },
];

function filterLeads(leads: Lead[], tab: FilterTab, query: string): Lead[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return leads.filter((lead) => {
    const matchesTab = tab === "all" || lead.status === tab;
    if (!matchesTab) return false;
    if (!normalizedQuery) return true;
    return [lead.name, lead.phone, lead.email ?? "", lead.propertyTitle ?? ""]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

/* ------------------------------------------------------------------ */
/*  Status Dropdown                                                    */
/* ------------------------------------------------------------------ */

function StatusDropdown({ lead }: { lead: Lead }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = LEAD_STATUS_LABELS[lead.status];

  function onSelect(status: LeadStatus) {
    if (status === lead.status) return;
    setError(null);
    startTransition(async () => {
      const result = await updateStatusAction(lead.id, status);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="space-y-1">
      <DropdownMenu>
        <DropdownMenuTrigger
        disabled={pending}
        className={cn(
          "inline-flex h-8 items-center justify-between gap-2 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-50",
          current.variant === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
            : current.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200"
              : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        )}
        >
          {current.label}
          <ChevronDown className="size-3 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {LEAD_PIPELINE.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => onSelect(status)}
              className="justify-end"
            >
              {LEAD_STATUS_LABELS[status].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="max-w-40 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [tab, setTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const filtered = filterLeads(leads, tab, query);

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-8 text-center">
        <p className="text-sm font-semibold text-foreground">
          لا توجد طلبات حتى الآن.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          ستظهر طلبات العملاء هنا عند تواصلهم مع وكالتك.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم العميل أو الهاتف أو العقار"
            aria-label="البحث في العملاء المحتملين"
            className="pr-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-secondary/50 p-1">
          {FILTER_TABS.map(({ key, label }) => {
            const count =
              key === "all" ? leads.length : leads.filter((l) => l.status === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "min-w-max flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  tab === key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className="mr-1 text-[10px] text-muted-foreground">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            لا توجد طلبات في هذه الحالة.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-xs text-muted-foreground">
                    <th className="p-4 font-medium">العميل</th>
                    <th className="p-4 font-medium">العقار</th>
                    <th className="p-4 font-medium">النوع</th>
                    <th className="p-4 font-medium">الحالة</th>
                    <th className="p-4 font-medium">التاريخ</th>
                    <th className="p-4 font-medium text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-secondary/40">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {l.name.charAt(0)}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">
                              {l.name}
                            </p>
                            <p dir="ltr" className="text-xs text-muted-foreground text-right">
                              {l.phone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {l.propertyId ? (
                          <Link
                            href={`/dashboard/properties/${l.propertyId}/preview`}
                            className="text-primary hover:underline"
                          >
                            {l.propertyTitle || "عقار محذوف"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">عام</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {LEAD_TYPE_LABELS[l.type]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <StatusDropdown lead={l} />
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatRelative(l.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/dashboard/leads/${l.id}`}
                            title="التفاصيل"
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <a
                            href={telHref(l.phone)}
                            title="اتصال"
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Phone className="size-4" />
                          </a>
                          <a
                            href={waHref(l.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="واتساب"
                            className="flex size-8 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-border md:hidden">
              {filtered.map((l) => (
                <div key={l.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {l.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">
                          {l.name}
                        </p>
                        <p dir="ltr" className="text-xs text-muted-foreground text-right">
                          {l.phone}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {LEAD_TYPE_LABELS[l.type]}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>العقار:</span>
                      {l.propertyId ? (
                        <Link
                          href={`/dashboard/properties/${l.propertyId}/preview`}
                          className="font-medium text-primary hover:underline"
                        >
                          {l.propertyTitle || "عقار محذوف"}
                        </Link>
                      ) : (
                        <span>عام</span>
                      )}
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>التاريخ:</span>
                      <span>{formatRelative(l.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <StatusDropdown lead={l} />
                    <div className="flex gap-1">
                      <a
                        href={telHref(l.phone)}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "size-8 p-0",
                        )}
                      >
                        <Phone className="size-4" />
                      </a>
                      <Link
                        href={`/dashboard/leads/${l.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "px-3 text-xs",
                        )}
                      >
                        تفاصيل
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
