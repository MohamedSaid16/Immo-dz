import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Eye,
  Inbox,
  Plus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatDZD, formatRelative } from "@/lib/utils";
import { LEAD_STATUS_LABELS, STATUS_LABELS, TRANSACTION_LABELS } from "@/lib/types";
import { getCurrentAgencyId, listPropertiesForAgency, getPropertyStats } from "@/lib/properties";
import { getLeadStats, listLeadsForAgency } from "@/lib/leads";

export default async function DashboardHome() {
  const agencyId = await getCurrentAgencyId();
  
  const properties = agencyId ? await listPropertiesForAgency(agencyId) : [];
  const propertyStats = agencyId ? await getPropertyStats(agencyId) : { totalViews: 0, totalContacts: 0 };
  const leadStats = agencyId ? await getLeadStats(agencyId) : null;
  const leads = agencyId ? await listLeadsForAgency(agencyId) : [];

  const recentProperties = properties.slice(0, 5);
  const recentLeads = leads.slice(0, 5);

  const stats = [
    {
      label: "عدد العقارات",
      value: properties.length,
      icon: Building2,
      trend: "عقاراتك المنشورة",
    },
    {
      label: "العملاء المحتملون",
      value: leadStats?.total ?? 0,
      icon: Users,
      trend: `+${leadStats?.thisWeek ?? 0} هذا الأسبوع`,
    },
    {
      label: "المشاهدات",
      value: propertyStats.totalViews,
      icon: Eye,
      trend: "إجمالي المشاهدات",
    },
    {
      label: "الطلبات الجديدة",
      value: leadStats?.new ?? 0,
      icon: Inbox,
      trend: "بانتظار الرد",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            نظرة عامة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ملخص أداء وكالتك ونشاط عملائك.
          </p>
        </div>
        <Link
          href="/dashboard/properties/add"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          <Plus />
          إضافة عقار
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, trend }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-3xl font-extrabold tabular-nums text-foreground">
                    {new Intl.NumberFormat("ar-DZ").format(value)}
                  </p>
                </div>
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="size-3.5" />
                {trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent properties */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>آخر العقارات</CardTitle>
            <Link
              href="/dashboard/properties"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-primary",
              )}
            >
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recentProperties.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                لا توجد عقارات بعد.{" "}
                <Link
                  href="/dashboard/properties/add"
                  className="font-medium text-primary hover:underline"
                >
                  أضف عقارك الأول
                </Link>
              </div>
            ) : (
              <>
                {/* Table on wide screens */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-right text-xs text-muted-foreground">
                        <th className="pb-3 font-medium">العقار</th>
                        <th className="pb-3 font-medium">الولاية</th>
                        <th className="pb-3 font-medium">السعر (دج)</th>
                        <th className="pb-3 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentProperties.map((p) => {
                        const status = STATUS_LABELS[p.status];
                        return (
                          <tr key={p.id}>
                            <td className="py-3">
                              <p className="font-medium text-foreground">
                                {p.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {TRANSACTION_LABELS[p.transaction]} · {p.rooms}{" "}
                                غرف · {p.area} م² · {formatRelative(p.createdAt)}
                              </p>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {p.wilaya}
                            </td>
                            <td className="py-3 font-semibold tabular-nums text-foreground">
                              {formatDZD(p.price)}
                            </td>
                            <td className="py-3">
                              <Badge variant={status.variant}>
                                {status.label}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Cards on mobile */}
                <div className="space-y-3 sm:hidden">
                  {recentProperties.map((p) => {
                    const status = STATUS_LABELS[p.status];
                    return (
                      <div
                        key={p.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {p.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.wilaya} · {TRANSACTION_LABELS[p.transaction]} ·{" "}
                            {p.area} م²
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums">
                            {formatDZD(p.price)} دج
                          </p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent leads */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>آخر العملاء</CardTitle>
            <Link 
              href="/dashboard/leads"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-primary"
              )}
            >
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {recentLeads.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                لا يوجد عملاء بعد.
              </p>
            )}
            {recentLeads.map((lead) => {
              const statusConfig = LEAD_STATUS_LABELS[lead.status];
              return (
                <div key={lead.id} className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {lead.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-foreground">
                        {lead.name}
                      </p>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.propertyTitle || "عام"}
                    </p>
                    <p dir="ltr" className="text-right text-xs text-muted-foreground">
                      {lead.phone} · {formatRelative(lead.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
