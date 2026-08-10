"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";

import {
  prepareSocialPublication,
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
  propertyId: string;
  publications: SocialPublication[];
  drafts: Record<SocialChannel, string>;
  loadError?: string;
  onDraftChange: (channel: SocialChannel, content: string) => void;
  onPublicationChange: (publication: SocialPublication) => void;
};

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

export function SocialPublishingSection({
  propertyId,
  publications,
  drafts,
  loadError,
  onDraftChange,
  onPublicationChange,
}: SocialPublishingSectionProps) {
  const [savingChannel, setSavingChannel] = useState<SocialChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveDraft(channel: SocialChannel): void {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>النشر الاجتماعي</CardTitle>
        <CardDescription>
          راجع المحتوى واحفظه كمسودة معتمدة. لا يتم النشر تلقائياً في هذه المرحلة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(loadError || error) && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error ?? loadError}
          </p>
        )}

        {SOCIAL_CHANNELS.map((channel) => {
          const publication = publications.find(
            (item) => item.channel === channel,
          );
          const isSaving = savingChannel === channel && isPending;

          return (
            <div key={channel} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label htmlFor={`social-${channel}`}>
                    {CHANNEL_LABELS[channel]}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    الحالة: {publication?.status === "draft" ? "مسودة" : "غير محضر"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  الحد: {channel === "facebook" ? 2000 : 1500} حرف
                </span>
              </div>

              <Textarea
                id={`social-${channel}`}
                value={drafts[channel]}
                onChange={(event) =>
                  onDraftChange(channel, event.target.value)
                }
                dir="ltr"
                rows={6}
                placeholder={`اكتب محتوى ${CHANNEL_LABELS[channel]} المعتمد...`}
                disabled={isPending}
              />

              <Button
                type="button"
                size="sm"
                onClick={() => saveDraft(channel)}
                disabled={isPending}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                حفظ المسودة
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
