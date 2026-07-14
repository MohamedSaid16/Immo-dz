import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";

import { LeadDeleteForm } from "./lead-delete-form";
import { LeadPipeline } from "./lead-pipeline";
import { LeadNotes } from "./lead-notes";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, telHref, waHref } from "@/lib/utils";
import { getLeadById } from "@/lib/leads";
import { LEAD_TYPE_LABELS } from "@/lib/types";

export default async function LeadDetailPage({
  params,
}: PageProps<"/dashboard/leads/[id]">) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header / Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          العودة إلى الطلبات
        </Link>
        <LeadDeleteForm leadId={lead.id} />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Main Info */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                    {lead.name.charAt(0)}
                  </span>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      {lead.name}
                    </h1>
                    <Badge variant="outline" className="mt-1">
                      {LEAD_TYPE_LABELS[lead.type]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                  <p dir="ltr" className="text-right font-medium">
                    {lead.phone}
                  </p>
                </div>
                {lead.email && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                    <p dir="ltr" className="text-right font-medium">
                      {lead.email}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">تاريخ الطلب</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {new Date(lead.createdAt).toLocaleDateString("ar-DZ")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">الوقت</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {new Date(lead.createdAt).toLocaleTimeString("ar-DZ")}
                  </p>
                </div>
              </div>

              {/* Message */}
              {lead.message && (
                <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MessageSquare className="size-4" />
                    رسالة العميل
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {lead.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline */}
          <LeadPipeline lead={lead} />

          {/* Notes (Client Component) */}
          <LeadNotes lead={lead} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">تواصل سريع</p>
              <a
                href={telHref(lead.phone)}
                className={cn(buttonVariants({ size: "default" }), "w-full gap-2")}
              >
                <Phone className="size-4" />
                اتصال بالعميل
              </a>
              <a
                href={waHref(lead.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "w-full gap-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                )}
              >
                <MessageSquare className="size-4" />
                مراسلة عبر واتساب
              </a>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "default" }),
                    "w-full gap-2"
                  )}
                >
                  <Mail className="size-4" />
                  إرسال بريد
                </a>
              )}
            </CardContent>
          </Card>

          {/* Property Link */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">العقار المرتبط</p>
              {lead.propertyId ? (
                <Link
                  href={`/dashboard/properties/${lead.propertyId}/preview`}
                  className="group flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/50 hover:bg-secondary/50"
                >
                  <p className="font-medium text-primary group-hover:underline">
                    {lead.propertyTitle}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    عرض المعاينة
                    <ChevronRight className="ml-auto size-3" />
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  استفسار عام أو العقار محذوف.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
