"use client";

import {
  useActionState,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CalendarCheck,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

import { submitLeadAction } from "@/app/dashboard/leads/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getStoredLeadSource } from "@/components/seo/lead-tracker";
import { LEAD_FIELD_LIMITS } from "@/lib/lead-validation";
import type { LeadType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Config per form type                                               */
/* ------------------------------------------------------------------ */

const FORM_CONFIG: Record<
  LeadType,
  { title: string; subtitle: string; icon: typeof FileText; showEmail: boolean }
> = {
  info: {
    title: "طلب معلومات",
    subtitle: "أرسل استفسارك وسنتواصل معك في أقرب وقت.",
    icon: FileText,
    showEmail: true,
  },
  visit: {
    title: "طلب زيارة",
    subtitle: "حدد موعدًا لزيارة العقار.",
    icon: CalendarCheck,
    showEmail: false,
  },
  reservation: {
    title: "طلب حجز",
    subtitle: "أبدِ رغبتك في حجز هذا العقار.",
    icon: ShieldCheck,
    showEmail: false,
  },
};

function subscribeToStoredLeadSource(): () => void {
  return () => undefined;
}

function getServerLeadSource(): string {
  return "unknown";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LeadForm({
  propertyId,
  agencyId,
  type,
  onClose,
}: {
  propertyId: string;
  agencyId: string;
  type: LeadType;
  onClose: () => void;
}) {
  const config = FORM_CONFIG[type];
  const Icon = config.icon;
  const [state, formAction, pending] = useActionState(
    submitLeadAction,
    undefined,
  );
  const backdropRef = useRef<HTMLDivElement>(null);

  const source = useSyncExternalStore(
    subscribeToStoredLeadSource,
    getStoredLeadSource,
    getServerLeadSource,
  );

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  // Success state
  if (state?.success) {
    return (
      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      >
        <div className="w-full max-w-md rounded-t-2xl bg-card p-8 text-center shadow-2xl sm:rounded-2xl">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            تم إرسال طلبك بنجاح
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            سيتواصل معك فريق الوكالة في أقرب وقت ممكن.
          </p>
          <Button onClick={onClose} className="mt-6 w-full" size="lg">
            إغلاق
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-foreground">{config.title}</h3>
              <p className="text-xs text-muted-foreground">
                {config.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form action={formAction} className="space-y-4 p-5">
          {/* Hidden fields */}
          <input type="hidden" name="agency_id" value={agencyId} />
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="source" value={source} />

          {/* Error */}
          {state && !state.success && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            >
              {state.error}
            </p>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">الاسم الكامل *</Label>
            <Input
              id="lead-name"
              name="name"
              placeholder="مثال: أحمد محمدي"
              required
              autoFocus
              maxLength={LEAD_FIELD_LIMITS.name}
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">رقم الهاتف *</Label>
            <Input
              id="lead-phone"
              name="phone"
              type="tel"
              dir="ltr"
              placeholder="0555 XX XX XX"
              required
              maxLength={32}
            />
          </div>

          {/* Email (info only) */}
          {config.showEmail && (
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">
                البريد الإلكتروني
                <span className="text-muted-foreground"> (اختياري)</span>
              </Label>
              <Input
                id="lead-email"
                name="email"
                type="email"
                dir="ltr"
                placeholder="email@example.com"
                maxLength={LEAD_FIELD_LIMITS.email}
              />
            </div>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-message">
              الرسالة
              <span className="text-muted-foreground"> (اختياري)</span>
            </Label>
            <Textarea
              id="lead-message"
              name="message"
              rows={3}
              maxLength={LEAD_FIELD_LIMITS.message}
              placeholder={
                type === "visit"
                  ? "الوقت المفضل للزيارة..."
                  : type === "reservation"
                    ? "ملاحظات حول الحجز..."
                    : "اكتب استفسارك هنا..."
              }
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Icon className="size-4" />
            )}
            {pending ? "جارٍ الإرسال..." : "إرسال الطلب"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            بإرسال هذا النموذج، أنت توافق على مشاركة بياناتك مع الوكالة
            المعنية.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trigger button (opens the modal)                                   */
/* ------------------------------------------------------------------ */

export function LeadFormTrigger({
  propertyId,
  agencyId,
  type,
  children,
  className,
}: {
  propertyId: string;
  agencyId: string;
  type: LeadType;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>

      {open && (
        <LeadForm
          propertyId={propertyId}
          agencyId={agencyId}
          type={type}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
