"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { trackInteraction } from "@/lib/interactions";
import {
  deleteLead,
  getLeadErrorMessage,
  submitLead,
  updateLeadNotes,
  updateLeadStatus,
} from "@/lib/leads";
import {
  isLeadStatus,
  isUuid,
  validateLeadNotes,
  validateLeadSubmission,
} from "@/lib/lead-validation";
import type { InteractionEvent } from "@/lib/types";

export type LeadFormState =
  | { success: true }
  | { success: false; error: string }
  | undefined;

export type LeadMutationResult =
  | { success: true }
  | { success: false; error: string };

export async function submitLeadAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const validation = validateLeadSubmission({
    agencyId: String(formData.get("agency_id") ?? "").trim(),
    propertyId: String(formData.get("property_id") ?? "").trim(),
    type: String(formData.get("type") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    source: formData.get("source"),
  });

  if (!validation.ok) {
    return { success: false, error: validation.error };
  }

  const result = await submitLead(validation.data);
  if ("error" in result) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function trackInteractionAction(
  propertyId: string,
  agencyId: string,
  event: InteractionEvent,
): Promise<void> {
  await trackInteraction(propertyId, agencyId, event);
}

export async function updateStatusAction(
  id: string,
  status: string,
): Promise<LeadMutationResult> {
  if (!isUuid(id) || !isLeadStatus(status)) {
    return { success: false, error: "بيانات حالة العميل غير صالحة." };
  }

  try {
    await updateLeadStatus(id, status);
    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: getLeadErrorMessage(error) };
  }
}

export async function updateNotesAction(
  id: string,
  notes: string,
): Promise<LeadMutationResult> {
  const notesError = validateLeadNotes(notes);
  if (!isUuid(id) || notesError) {
    return {
      success: false,
      error: notesError ?? "معرّف العميل غير صالح.",
    };
  }

  try {
    await updateLeadNotes(id, notes);
    revalidatePath(`/dashboard/leads/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: getLeadErrorMessage(error) };
  }
}

export async function deleteLeadAction(id: string): Promise<void> {
  if (!isUuid(id)) throw new Error("معرّف العميل غير صالح.");

  try {
    await deleteLead(id);
  } catch (error) {
    throw new Error(getLeadErrorMessage(error, "تعذّر حذف العميل."));
  }

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  redirect("/dashboard/leads");
}
