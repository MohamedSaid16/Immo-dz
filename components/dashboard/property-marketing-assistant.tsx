"use client";

import { useState, useTransition, type RefObject } from "react";
import { Check, Clipboard, Loader2, Sparkles } from "lucide-react";

import { generatePropertyMarketing } from "@/app/dashboard/properties/ai-actions";
import {
  PROPERTY_MARKETING_FIELDS,
  type PropertyMarketingContent,
  type PropertyMarketingField,
  type PropertyMarketingOperation,
} from "@/lib/ai/contracts";
import type {
  SocialActionResult,
  SocialChannel,
} from "@/lib/social-publishing/contracts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type PropertyMarketingAssistantProps = {
  formRef: RefObject<HTMLFormElement | null>;
  onApplyField: (field: "title" | "description" | "title_fr" | "description_fr", value: string) => void;
  onPrepareSocial?: (
    channel: SocialChannel,
    content: string,
  ) => Promise<SocialActionResult>;
};

const FIELD_LABELS: Record<PropertyMarketingField, string> = {
  title_ar: "العنوان بالعربية",
  description_ar: "الوصف بالعربية",
  title_fr: "Titre en français",
  description_fr: "Description en français",
  facebook_post: "منشور Facebook",
  instagram_caption: "وصف Instagram",
  whatsapp_message: "رسالة WhatsApp",
  seo_title: "عنوان SEO",
  seo_description: "وصف SEO",
};

const ARABIC_FIELDS = new Set<PropertyMarketingField>([
  "title_ar",
  "description_ar",
]);

const FORM_FIELD_MAP: Partial<
  Record<PropertyMarketingField, "title" | "description" | "title_fr" | "description_fr">
> = {
  title_ar: "title",
  description_ar: "description",
  title_fr: "title_fr",
  description_fr: "description_fr",
};

const SOCIAL_FIELDS = new Set<PropertyMarketingField>([
  "facebook_post",
  "instagram_caption",
  "whatsapp_message",
]);

const SOCIAL_HANDOFF_MAP: Partial<Record<PropertyMarketingField, SocialChannel>> = {
  facebook_post: "facebook",
  instagram_caption: "instagram",
};

function fieldGroup(field: PropertyMarketingField): "arabic" | "french" | "social" | "seo" {
  if (ARABIC_FIELDS.has(field)) return "arabic";
  if (field === "title_fr" || field === "description_fr") return "french";
  if (SOCIAL_FIELDS.has(field)) return "social";
  return "seo";
}

export function PropertyMarketingAssistant({
  formRef,
  onApplyField,
  onPrepareSocial,
}: PropertyMarketingAssistantProps) {
  const [content, setContent] = useState<PropertyMarketingContent | null>(null);
  const [editingField, setEditingField] = useState<PropertyMarketingField | null>(null);
  const [copiedField, setCopiedField] = useState<PropertyMarketingField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const [preparedChannel, setPreparedChannel] = useState<SocialChannel | null>(null);
  const [isPending, startTransition] = useTransition();

  function runOperation(operation: PropertyMarketingOperation): void {
    const form = formRef.current;
    if (!form) {
      setError("تعذّر قراءة بيانات العقار الحالية.");
      return;
    }

    setError(null);
    const formData = new FormData(form);
    const previous = operation === "improve" || operation === "shorten" ? content : undefined;

    startTransition(async () => {
      const result = await generatePropertyMarketing(formData, operation, previous);
      if (!result.ok) {
        setError(result.error);
        if (result.quota) setQuota(result.quota);
        return;
      }
      setContent(result.content);
      setQuota(result.quota);
      setEditingField(null);
      setCopiedField(null);
    });
  }

  function updateField(field: PropertyMarketingField, value: string): void {
    setContent((current) => (current ? { ...current, [field]: value } : current));
  }

  async function copyField(field: PropertyMarketingField): Promise<void> {
    const value = content?.[field];
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1600);
    } catch {
      setError("تعذّر نسخ المحتوى. حدّد النص وانسخه يدوياً.");
    }
  }

  function applyField(field: PropertyMarketingField): void {
    const formField = FORM_FIELD_MAP[field];
    const value = content?.[field];
    if (formField && value) onApplyField(formField, value);
  }

  async function handoffSocialContent(field: PropertyMarketingField): Promise<void> {
    const channel = SOCIAL_HANDOFF_MAP[field];
    const value = content?.[field];
    if (!channel || !value || !onPrepareSocial) return;

    setError(null);
    setHandoffPending(true);
    const result = await onPrepareSocial(channel, value);
    setHandoffPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPreparedChannel(channel);
    window.setTimeout(() => setPreparedChannel(null), 1800);
  }

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              مساعد التسويق العقاري
            </CardTitle>
            <CardDescription>
              أنشئ نصوصاً تسويقية مبنية على معلومات العقار الحالية فقط. راجع كل نتيجة قبل تطبيقها.
            </CardDescription>
          </div>
          {quota && (
            <span className="shrink-0 text-xs text-muted-foreground">
              الاستخدام اليومي: {quota.used} / {quota.limit}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => runOperation("generate")} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            إنشاء باستخدام AI
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runOperation("regenerate")}
            disabled={isPending || !content}
          >
            إعادة الإنشاء
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runOperation("improve")}
            disabled={isPending || !content}
          >
            تحسين
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runOperation("shorten")}
            disabled={isPending || !content}
          >
            اختصار
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {content && (
          <div className="space-y-4">
            {PROPERTY_MARKETING_FIELDS.map((field) => {
              const group = fieldGroup(field);
              const isEditing = editingField === field;
              const formField = FORM_FIELD_MAP[field];
              const isSocialOrSeo = group === "social" || group === "seo";

              return (
                <div key={field} className="space-y-2 rounded-md border border-border/80 bg-secondary/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{FIELD_LABELS[field]}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingField(isEditing ? null : field)}
                      >
                        {isEditing ? "تم" : "تعديل"}
                      </Button>
                      {formField && (
                        <Button type="button" size="sm" variant="outline" onClick={() => applyField(field)}>
                          تطبيق
                        </Button>
                      )}
                      {isSocialOrSeo && (
                        <Button type="button" size="sm" variant="outline" onClick={() => void copyField(field)}>
                          {copiedField === field ? <Check /> : <Clipboard />}
                          {copiedField === field ? "تم النسخ" : "نسخ"}
                        </Button>
                      )}
                      {SOCIAL_HANDOFF_MAP[field] && onPrepareSocial && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handoffSocialContent(field)}
                          disabled={isPending || handoffPending}
                        >
                          {preparedChannel === SOCIAL_HANDOFF_MAP[field]
                            ? "تم الحفظ كمسودة"
                            : `استخدام لـ ${SOCIAL_HANDOFF_MAP[field] === "facebook" ? "Facebook" : "Instagram"}`}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={content[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    disabled={!isEditing}
                    dir={ARABIC_FIELDS.has(field) ? "rtl" : "ltr"}
                    rows={field.includes("description") || isSocialOrSeo ? 5 : 2}
                    aria-label={FIELD_LABELS[field]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
