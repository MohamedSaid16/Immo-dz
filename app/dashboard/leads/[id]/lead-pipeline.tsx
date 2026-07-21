"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { updateStatusAction } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LEAD_PIPELINE,
  LEAD_STATUS_LABELS,
  type Lead,
  type LeadStatus,
} from "@/lib/types";

export function LeadPipeline({ lead }: { lead: Lead }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentIndex = LEAD_PIPELINE.indexOf(lead.status);

  function handleSelect(status: LeadStatus, index: number) {
    if (status === lead.status) return;

    // Optional: confirm if moving backwards
    if (index < currentIndex) {
      if (!window.confirm("هل أنت متأكد من إرجاع حالة العميل للوراء؟")) {
        return;
      }
    }

    setError(null);
    startTransition(async () => {
      const result = await updateStatusAction(lead.id, status);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">مسار المبيعات</h2>
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        <div
          className="-mx-2 overflow-x-auto px-2 pb-2"
          role="region"
          aria-label="مراحل مسار المبيعات"
          tabIndex={0}
        >
          <div className="relative min-w-[42rem]">
            {/* Connecting line */}
            <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-secondary" />

            <div className="relative flex justify-between gap-2">
              {LEAD_PIPELINE.map((status, index) => {
                const isActive = index === currentIndex;
                const isPast = index < currentIndex;
                const isFuture = index > currentIndex;
                const config = LEAD_STATUS_LABELS[status];

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleSelect(status, index)}
                    disabled={pending}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 outline-none",
                      pending && "opacity-50",
                    )}
                  >
                    {/* Circle */}
                    <div
                      className={cn(
                        "z-10 flex size-8 items-center justify-center rounded-full border-2 bg-card transition-colors group-hover:scale-110",
                        isActive &&
                          "border-primary bg-primary text-primary-foreground",
                        isPast && "border-primary bg-primary/10 text-primary",
                        isFuture && "border-border text-muted-foreground",
                      )}
                    >
                      {isPast ? (
                        <Check className="size-4" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-center text-[11px] font-medium whitespace-nowrap transition-colors",
                        isActive
                          ? "font-bold text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
