import "server-only";

import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  isLeadStatus,
  isUuid,
  normalizeLeadSource,
  validateLeadNotes,
} from "@/lib/lead-validation";
import type { Lead, LeadSource, LeadStatus, LeadType } from "@/lib/types";

type LeadRow = {
  id: string;
  agency_id: string;
  property_id: string | null;
  type: LeadType;
  status: LeadStatus;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  property: { title: string } | null;
};

const LEAD_SELECT = `
  id, agency_id, property_id, type, status,
  name, phone, email, message, notes, source,
  created_at, updated_at,
  property:properties ( title )
`;

const EMPTY_LEAD_STATS = {
  total: 0,
  new: 0,
  contacted: 0,
  visitScheduled: 0,
  visited: 0,
  negotiating: 0,
  converted: 0,
  lost: 0,
  thisWeek: 0,
};

type LeadStats = typeof EMPTY_LEAD_STATS;

class LeadOperationError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = "LeadOperationError";
  }
}

function logLeadError(
  operation: string,
  error: { code?: string },
  context?: Record<string, string>,
): void {
  console.error(`[leads:${operation}]`, {
    ...context,
    code: error.code ?? "unexpected",
  });
}

function requireSupabase(): void {
  if (!isSupabaseConfigured()) {
    throw new LeadOperationError("الخدمة غير متوفرة حالياً.");
  }
}

async function getAuthenticatedAgencyId(): Promise<string> {
  requireSupabase();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logLeadError("authorize-user", authError);
    throw new LeadOperationError("تعذّر التحقق من الجلسة. يرجى تسجيل الدخول مجدداً.");
  }
  if (!user) {
    throw new LeadOperationError("يجب تسجيل الدخول لإتمام هذه العملية.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logLeadError("authorize-profile", profileError, { userId: user.id });
    throw new LeadOperationError("تعذّر التحقق من الوكالة الحالية.");
  }
  if (!profile?.agency_id) {
    throw new LeadOperationError("لا توجد وكالة مرتبطة بهذا الحساب.");
  }

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("id")
    .eq("id", profile.agency_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (agencyError) {
    logLeadError("authorize-agency", agencyError, { userId: user.id });
    throw new LeadOperationError("تعذّر التحقق من ملكية الوكالة الحالية.");
  }
  if (!agency) {
    throw new LeadOperationError("لا تملك صلاحية إدارة هذه الوكالة.");
  }

  return profile.agency_id;
}

async function requireAgencyAccess(agencyId: string): Promise<void> {
  if (!isUuid(agencyId)) {
    throw new LeadOperationError("معرّف الوكالة غير صالح.");
  }
  const currentAgencyId = await getAuthenticatedAgencyId();
  if (currentAgencyId !== agencyId) {
    throw new LeadOperationError("لا تملك صلاحية الوصول إلى هذه البيانات.");
  }
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    agencyId: row.agency_id,
    propertyId: row.property_id,
    type: row.type,
    status: row.status,
    name: row.name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    notes: row.notes,
    source: normalizeLeadSource(row.source),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    propertyTitle: row.property?.title,
  };
}

export function getLeadErrorMessage(
  error: unknown,
  fallback = "تعذّر إتمام العملية، حاول مرة أخرى.",
): string {
  return error instanceof LeadOperationError ? error.userMessage : fallback;
}

/* ------------------------------------------------------------------ */
/*  Public lead submission                                             */
/* ------------------------------------------------------------------ */

export async function submitLead(data: {
  agencyId: string;
  propertyId: string;
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  source?: LeadSource;
}): Promise<{ id: string } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "الخدمة غير متوفرة حالياً." };
  }

  const supabase = await createClient();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, agency_id")
    .eq("id", data.propertyId)
    .eq("agency_id", data.agencyId)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();

  if (propertyError) {
    logLeadError("verify-property", propertyError, {
      propertyId: data.propertyId,
      agencyId: data.agencyId,
    });
    return { error: "تعذّر التحقق من العقار، حاول مرة أخرى." };
  }
  if (!property) {
    return { error: "هذا العقار غير متاح لاستقبال الطلبات حالياً." };
  }

  const id = randomUUID();
  const { error: insertError } = await supabase.from("leads").insert({
      id,
      agency_id: property.agency_id,
      property_id: property.id,
      type: data.type,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      message: data.message || null,
      source: normalizeLeadSource(data.source),
    });

  if (insertError) {
    logLeadError("submit", insertError, {
      propertyId: property.id,
      agencyId: property.agency_id,
    });
    return { error: "تعذّر إرسال الطلب، حاول مرة أخرى." };
  }

  return { id };
}

/* ------------------------------------------------------------------ */
/*  Authenticated agency CRM                                           */
/* ------------------------------------------------------------------ */

export async function listLeadsForAgency(agencyId: string): Promise<Lead[]> {
  await requireAgencyAccess(agencyId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    logLeadError("list", error, { agencyId });
    throw new LeadOperationError("تعذّر تحميل العملاء المحتملين.");
  }

  return (data as unknown as LeadRow[]).map(mapLead);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  if (!isUuid(id)) return null;
  const agencyId = await getAuthenticatedAgencyId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (error) {
    logLeadError("detail", error, { leadId: id, agencyId });
    throw new LeadOperationError("تعذّر تحميل تفاصيل العميل.");
  }

  return data ? mapLead(data as unknown as LeadRow) : null;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<void> {
  if (!isUuid(id) || !isLeadStatus(status)) {
    throw new LeadOperationError("بيانات حالة العميل غير صالحة.");
  }
  const agencyId = await getAuthenticatedAgencyId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)
    .eq("agency_id", agencyId)
    .select("id")
    .maybeSingle();

  if (error) {
    logLeadError("update-status", error, { leadId: id, agencyId, status });
    throw new LeadOperationError("تعذّر تحديث حالة العميل.");
  }
  if (!data) {
    throw new LeadOperationError("العميل غير موجود أو لا تملك صلاحية تعديله.");
  }
}

export async function updateLeadNotes(id: string, notes: string): Promise<void> {
  const notesError = validateLeadNotes(notes);
  if (!isUuid(id) || notesError) {
    throw new LeadOperationError(notesError ?? "معرّف العميل غير صالح.");
  }
  const agencyId = await getAuthenticatedAgencyId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ notes })
    .eq("id", id)
    .eq("agency_id", agencyId)
    .select("id")
    .maybeSingle();

  if (error) {
    logLeadError("update-notes", error, { leadId: id, agencyId });
    throw new LeadOperationError("تعذّر حفظ الملاحظات.");
  }
  if (!data) {
    throw new LeadOperationError("العميل غير موجود أو لا تملك صلاحية تعديله.");
  }
}

export async function deleteLead(id: string): Promise<void> {
  if (!isUuid(id)) throw new LeadOperationError("معرّف العميل غير صالح.");
  const agencyId = await getAuthenticatedAgencyId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("agency_id", agencyId)
    .select("id")
    .maybeSingle();

  if (error) {
    logLeadError("delete", error, { leadId: id, agencyId });
    throw new LeadOperationError("تعذّر حذف العميل.");
  }
  if (!data) {
    throw new LeadOperationError("العميل غير موجود أو لا تملك صلاحية حذفه.");
  }
}

export async function getLeadStats(agencyId: string): Promise<LeadStats> {
  await requireAgencyAccess(agencyId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("status, created_at")
    .eq("agency_id", agencyId);

  if (error) {
    logLeadError("stats", error, { agencyId });
    throw new LeadOperationError("تعذّر تحميل إحصائيات العملاء.");
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const stats: LeadStats = { ...EMPTY_LEAD_STATS, total: data.length };
  for (const row of data) {
    switch (row.status as LeadStatus) {
      case "new": stats.new++; break;
      case "contacted": stats.contacted++; break;
      case "visit_scheduled": stats.visitScheduled++; break;
      case "visited": stats.visited++; break;
      case "negotiating": stats.negotiating++; break;
      case "converted": stats.converted++; break;
      case "lost": stats.lost++; break;
    }
    if (new Date(row.created_at) >= weekAgo) stats.thisWeek++;
  }

  return stats;
}
