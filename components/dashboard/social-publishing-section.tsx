"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";

import {
  prepareSocialPublication,
  requestSocialPublication,
  retrySocialPublication,
  updateSocialPublicationContent,
} from "@/app/dashboard/properties/social-actions";
import {
  SOCIAL_CHANNELS,
  type SocialChannel,
  type SocialPublication,
} from "@/lib/social-publishing/contracts";
import { validateSocialContent } from "@/lib/social-publishing/validation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SocialPublishingSectionProps = {
  propertyId?: string;
  publications: SocialPublication[];
  drafts: Record<SocialChannel, string>;
  loadError?: string;
  disabled?: boolean;
  onDraftChange: (channel: SocialChannel, content: string) => void;
  onPublicationChange: (publication: SocialPublication) => void;
};

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

const STATUS_LABELS: Record<SocialPublication["status"], string> = {
  draft: "مسودة",
  queued: "قيد الانتظار",
  publishing: "جارٍ النشر",
  published: "تم النشر",
  failed: "فشل النشر",
};

export function SocialPublishingSection({
  propertyId,
  publications,
  drafts,
  loadError,
  disabled = false,
  onDraftChange,
  onPublicationChange,
}: SocialPublishingSectionProps) {
  const [savingChannel, setSavingChannel] = useState<SocialChannel | null>(null);
  const [publishingChannel, setPublishingChannel] = useState<SocialChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveDraft(channel: SocialChannel): void {
    if (!propertyId || disabled) return;

    const validation = validateSocialContent(channel, drafts[channel]);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setError(null);
    setSavingChannel(channel);
    startTransition(async () => {
      const existing = publications.find((item) => item.channel === channel);
      const result = existing
        ? await updateSocialPublicationContent(existing.id, validation.content)
        : await prepareSocialPublication(propertyId, channel, validation.content);
      if (!result.ok) {
        setError(result.error);
        setSavingChannel(null);
        return;
      }

      onPublicationChange(result.publication);
      onDraftChange(channel, result.publication.approvedContent);
      setSavingChannel(null);
    });
  }

  function publish(channel: SocialChannel): void {
    const publication = publications.find((item) => item.channel === channel);
    if (!publication || (publication.status !== "draft" && publication.status !== "failed")) {
      return;
    }

    setError(null);
    setPublishingChannel(channel);
    startTransition(async () => {
      const result = publication.status === "failed"
        ? await retrySocialPublication(publication.id)
        : await requestSocialPublication(publication.id);
      if (!result.ok) {
        setError(result.error);
        setPublishingChannel(null);
        return;
      }

      onPublicationChange(result.result.publication);
      onDraftChange(channel, result.result.publication.approvedContent);
      if (result.delivery === "failed") {
        setError("تم حفظ الطلب، لكن تعذّر الاتصال بخدمة النشر. يمكنك المحاولة لاحقاً.");
      } else if (result.delivery === "disabled") {
        setError("تم وضع الطلب في قائمة الانتظار. خدمة النشر غير مفعّلة حالياً.");
      }
      setPublishingChannel(null);
    });
  }

  if (disabled) {
    return (
      <Card className="border-dashed bg-secondary/20 shadow-none">
        <CardHeader>
          <CardTitle>النشر الاجتماعي</CardTitle>
          <CardDescription>
            جهّز محتوى Facebook وInstagram بعد حفظ العقار وفتح صفحة التعديل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p role="status" className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            احفظ العقار أولاً، ثم يمكنك تجهيز محتوى Facebook وInstagram من صفحة التعديل.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>النشر الاجتماعي</CardTitle>
        <CardDescription>
          راجع المحتوى واحفظه كمسودة معتمدة. لا يتم النشر تلقائياً.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(loadError || error) && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error ?? loadError}
          </p>
        )}

        {SOCIAL_CHANNELS.map((channel) => {
          const publication = publications.find((item) => item.channel === channel);
          const isSaving = savingChannel === channel && isPending;
          const isPublishing = publishingChannel === channel && isPending;
          const isEditable = !publication || publication.status === "draft";

          return (
            <div key={channel} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label htmlFor={`social-${channel}`}>{CHANNEL_LABELS[channel]}</Label>
                  <p className="text-xs text-muted-foreground">
                    الحالة: {publication ? STATUS_LABELS[publication.status] : "غير مجهز"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  الحد: {channel === "facebook" ? 2000 : 1500} حرف
                </span>
              </div>

              <Textarea
                id={`social-${channel}`}
                value={drafts[channel]}
                onChange={(event) => onDraftChange(channel, event.target.value)}
                dir="ltr"
                rows={6}
                placeholder={`اكتب محتوى ${CHANNEL_LABELS[channel]} المعتمد...`}
                disabled={isPending || !isEditable}
              />

              <div className="flex flex-wrap items-center gap-2">
                {isEditable && (
                  <Button type="button" size="sm" onClick={() => saveDraft(channel)} disabled={isPending}>
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                    حفظ المسودة
                  </Button>
                )}
                {publication && (publication.status === "draft" || publication.status === "failed") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => publish(channel)}
                    disabled={isPending || !publication.approvedContent.trim()}
                  >
                    {isPublishing ? <Loader2 className="animate-spin" /> : null}
                    {publication.status === "failed" ? "إعادة المحاولة" : "طلب النشر"}
                  </Button>
                )}
                {publication?.status === "published" && publication.externalPostUrl && (
                  <a href={publication.externalPostUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    فتح المنشور
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
