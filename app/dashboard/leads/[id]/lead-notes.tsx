"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";

import { updateNotesAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_FIELD_LIMITS } from "@/lib/lead-validation";
import type { Lead } from "@/lib/types";

export function LeadNotes({ lead }: { lead: Lead }) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const isChanged = notes !== (lead.notes || "");

  function handleSave() {
    if (!isChanged) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await updateNotesAction(lead.id, notes);
      setFeedback(
        result.success
          ? { type: "success", message: "تم حفظ الملاحظات." }
          : { type: "error", message: result.error },
      );
    });
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">ملاحظات الوكالة</h2>
        </div>
        
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="اكتب ملاحظاتك حول هذا العميل هنا (مثال: يفضل شقة بطابق منخفض، طلب تخفيض السعر...)"
          className="min-h-[150px] resize-y"
          maxLength={LEAD_FIELD_LIMITS.notes}
        />

        <div className="flex items-center justify-between gap-3 text-xs">
          <p
            role="status"
            className={
              feedback?.type === "error"
                ? "text-destructive"
                : "text-emerald-600 dark:text-emerald-400"
            }
          >
            {feedback?.message}
          </p>
          <span className="mr-auto text-muted-foreground">
            {notes.length}/{LEAD_FIELD_LIMITS.notes}
          </span>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!isChanged || pending}
            className="gap-2"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            حفظ الملاحظات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
