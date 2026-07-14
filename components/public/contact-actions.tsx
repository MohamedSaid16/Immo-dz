"use client";

import {
  CalendarCheck,
  FileText,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { LeadFormTrigger } from "./lead-form";
import { WhatsAppIcon } from "./property-card";
import { trackInteractionAction } from "@/app/dashboard/leads/actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, telHref, waHref } from "@/lib/utils";

/**
 * Contact sidebar for the property detail page.
 * Separates concerns: Call/WhatsApp are interaction-tracked links,
 * while Info/Visit/Reservation open lead capture forms.
 */
export function ContactActions({
  propertyId,
  agencyId,
  agencyPhone,
  propertyTitle,
}: {
  propertyId: string;
  agencyId: string;
  agencyPhone: string | null;
  propertyTitle: string;
}) {
  const message = `مرحبًا، أنا مهتم بالعقار "${propertyTitle}".`;

  function handlePhoneClick() {
    void trackInteractionAction(propertyId, agencyId, "phone_click");
  }

  function handleWhatsAppClick() {
    void trackInteractionAction(propertyId, agencyId, "whatsapp_click");
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="text-sm font-semibold text-foreground">
          مهتم بهذا العقار؟
        </p>

        {/* Direct contact — interaction-tracked, not lead-creating */}
        {agencyPhone && (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={telHref(agencyPhone)}
              onClick={handlePhoneClick}
              className={cn(
                buttonVariants({ size: "lg" }),
                "gap-2",
              )}
            >
              <Phone className="size-4" />
              اتصل الآن
            </a>
            <a
              href={waHref(agencyPhone, message)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "gap-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
              )}
            >
              <WhatsAppIcon className="size-5" />
              واتساب
            </a>
          </div>
        )}

        {agencyPhone && (
          <p dir="ltr" className="text-center text-sm text-muted-foreground">
            {agencyPhone}
          </p>
        )}

        {/* Divider */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-3 text-[11px] text-muted-foreground">
              أو أرسل طلبك
            </span>
          </div>
        </div>

        {/* Lead forms — these create actual leads */}
        <div className="space-y-2">
          <LeadFormTrigger
            propertyId={propertyId}
            agencyId={agencyId}
            type="info"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "w-full justify-start gap-2",
            )}
          >
            <FileText className="size-4 text-primary" />
            طلب معلومات
          </LeadFormTrigger>

          <LeadFormTrigger
            propertyId={propertyId}
            agencyId={agencyId}
            type="visit"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "w-full justify-start gap-2",
            )}
          >
            <CalendarCheck className="size-4 text-primary" />
            طلب زيارة
          </LeadFormTrigger>

          <LeadFormTrigger
            propertyId={propertyId}
            agencyId={agencyId}
            type="reservation"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "w-full justify-start gap-2",
            )}
          >
            <ShieldCheck className="size-4 text-primary" />
            طلب حجز
          </LeadFormTrigger>
        </div>
      </CardContent>
    </Card>
  );
}
