"use client";

import { Trash2 } from "lucide-react";

import { deleteLeadAction } from "../actions";
import { Button } from "@/components/ui/button";

export function LeadDeleteForm({ leadId }: { leadId: string }) {
  return (
    <form
      action={deleteLeadAction.bind(null, leadId)}
      onSubmit={(event) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا العميل؟")) {
          event.preventDefault();
        }
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="mr-2 size-4" />
        حذف
      </Button>
    </form>
  );
}
