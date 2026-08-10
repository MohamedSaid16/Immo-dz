import { Suspense } from "react";
import { Download, Inbox } from "lucide-react";

import { LeadsTable } from "./leads-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentAgencyId } from "@/lib/properties";
import { getLeadStats, listLeadsForAgency } from "@/lib/leads";

export default async function LeadsPage() {
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
        يرجى إكمال بيانات الوكالة لعرض العملاء المحتملين.
      </div>
    );
  }

  const [stats, leads] = await Promise.all([
    getLeadStats(agencyId),
    listLeadsForAgency(agencyId),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            العملاء المحتملون
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.total} عميل — أدر عملاءك وتابع تقدمهم من مكان واحد.
          </p>
        </div>
        <Button type="button" variant="outline" className="gap-2" disabled>
          <Download className="size-4" />
          تصدير (قريباً)
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              إجمالي العملاء
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-primary">طلبات جديدة</p>
            <p className="mt-1 flex items-end gap-2 text-3xl font-extrabold tabular-nums text-foreground">
              {stats.new}
              <span className="mb-1 text-xs font-semibold text-primary">
                بانتظار الرد
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              طلبات هذا الأسبوع
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              +{stats.thisWeek}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main table */}
      <Suspense
        fallback={
          <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-border bg-card">
            <Inbox className="size-8 animate-pulse text-muted-foreground/30" />
          </div>
        }
      >
        <LeadsTable leads={leads} />
      </Suspense>
    </div>
  );
}
