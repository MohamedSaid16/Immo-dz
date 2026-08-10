"use server";

import { getCurrentAgencyId, getPropertyById } from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";

import {
  AiProviderError,
  type AiQuotaInfo,
  type PropertyMarketingActionResult,
  type PropertyMarketingContent,
  type PropertyMarketingOperation,
} from "@/lib/ai/contracts";
import { createPropertyMarketingContext, isPreviousContent } from "@/lib/ai/property-context";
import {
  getAiConfiguration,
  getPropertyMarketingProvider,
} from "@/lib/ai/provider";
import {
  validateMarketingOperation,
  validatePropertyMarketingContent,
} from "@/lib/ai/validation";

type RpcRecord = Record<string, unknown>;

function firstRpcRecord(value: unknown): RpcRecord | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "object" && first !== null && !Array.isArray(first)
      ? (first as RpcRecord)
      : null;
  }
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RpcRecord)
    : null;
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function quotaInfo(used: unknown, limit: number): AiQuotaInfo {
  return { used: Math.max(0, numberValue(used) ?? 0), limit };
}

function logAiError(operation: string, error: unknown): void {
  if (error instanceof AiProviderError) {
    console.error(`[ai:${operation}]`, {
      kind: error.kind,
      status: error.status ?? "unexpected",
    });
    return;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    console.error(`[ai:${operation}]`, {
      code: typeof record.code === "string" ? record.code : "unexpected",
    });
    return;
  }

  console.error(`[ai:${operation}]`, { code: "unexpected" });
}

async function releaseReservation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reservationId: string,
): Promise<void> {
  const { error } = await supabase.rpc("release_ai_generation", {
    reservation_id: reservationId,
  });
  if (error) logAiError("quota-release", error);
}

async function reserveQuota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit: number,
): Promise<
  | { ok: true; reservationId: string; quota: AiQuotaInfo }
  | { ok: false; error: string; quota?: AiQuotaInfo }
> {
  const { data, error } = await supabase.rpc("reserve_ai_generation", {
    requested_limit: limit,
  });

  if (error) {
    logAiError("quota-reserve", error);
    return { ok: false, error: "تعذّر التحقق من حصة استخدام المساعد حالياً." };
  }

  const row = firstRpcRecord(data);
  if (!row || typeof row.allowed !== "boolean") {
    return { ok: false, error: "تعذّر قراءة حصة استخدام المساعد حالياً." };
  }

  const quota = quotaInfo(
    Number(row.generation_count ?? 0) + Number(row.reserved_count ?? 0),
    limit,
  );

  if (!row.allowed || typeof row.reservation_id !== "string") {
    return {
      ok: false,
      error: "لقد وصلت وكالتك إلى حد استخدام المساعد اليومي.",
      quota,
    };
  }

  return { ok: true, reservationId: row.reservation_id, quota };
}

async function completeReservation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reservationId: string,
  limit: number,
): Promise<AiQuotaInfo | null> {
  const { data, error } = await supabase.rpc("complete_ai_generation", {
    reservation_id: reservationId,
  });

  if (error) {
    logAiError("quota-complete", error);
    return null;
  }

  const row = firstRpcRecord(data);
  if (!row || row.completed !== true) return null;
  return quotaInfo(row.generation_count, limit);
}

export async function generatePropertyMarketing(
  formData: FormData,
  operation: PropertyMarketingOperation,
  previousContent?: unknown,
): Promise<PropertyMarketingActionResult> {
  if (!validateMarketingOperation(operation)) {
    return { ok: false, error: "عملية المساعد غير صالحة." };
  }

  const configuration = getAiConfiguration();
  if (!configuration.enabled) {
    return { ok: false, error: "المساعد غير مفعّل حالياً. يمكنك حفظ العقار بشكل طبيعي." };
  }
  if (configuration.provider !== "openai" || !configuration.apiKey) {
    return { ok: false, error: "لم يتم إعداد خدمة المساعد بشكل صحيح بعد." };
  }

  const context = createPropertyMarketingContext(formData);
  if (!context.ok) return { ok: false, error: context.error };

  let agencyId: string | null;
  try {
    agencyId = await getCurrentAgencyId();
  } catch (error) {
    logAiError("authorization", error);
    return { ok: false, error: "تعذّر التحقق من حساب الوكالة حالياً." };
  }
  if (!agencyId) {
    return { ok: false, error: "يجب تسجيل الدخول إلى وكالة قبل استخدام المساعد." };
  }

  if (context.propertyId) {
    let property: Awaited<ReturnType<typeof getPropertyById>>;
    try {
      property = await getPropertyById(context.propertyId);
    } catch (error) {
      logAiError("property-authorization", error);
      return { ok: false, error: "تعذّر التحقق من ملكية العقار حالياً." };
    }
    if (!property || property.agencyId !== agencyId) {
      return { ok: false, error: "العقار غير موجود أو لا ينتمي إلى وكالتك." };
    }
  }

  let validatedPrevious: PropertyMarketingContent | undefined;
  if (operation === "improve" || operation === "shorten") {
    if (!isPreviousContent(previousContent)) {
      return { ok: false, error: "لا يوجد محتوى سابق صالح لإعادة صياغته." };
    }
    const validation = validatePropertyMarketingContent(previousContent);
    if (!validation.ok) return { ok: false, error: validation.error };
    validatedPrevious = validation.content;
  }

  const provider = getPropertyMarketingProvider(configuration);
  if (!provider) {
    return { ok: false, error: "خدمة المساعد غير متاحة حالياً." };
  }

  const supabase = await createClient();
  const reservation = await reserveQuota(supabase, configuration.dailyLimit);
  if (!reservation.ok) return reservation;

  try {
    const content = await provider.generate({
      facts: context.facts,
      operation,
      previous_content: validatedPrevious,
    });

    const quota = await completeReservation(
      supabase,
      reservation.reservationId,
      configuration.dailyLimit,
    );
    if (!quota) {
      await releaseReservation(supabase, reservation.reservationId);
      return { ok: false, error: "تعذّر تسجيل استخدام المساعد. لم يتم تطبيق النتيجة." };
    }

    return { ok: true, content, quota };
  } catch (error) {
    await releaseReservation(supabase, reservation.reservationId);
    logAiError("generation", error);

    if (error instanceof AiProviderError && error.kind === "rate_limit") {
      return { ok: false, error: "خدمة المساعد مشغولة حالياً. حاول لاحقاً." };
    }
    if (error instanceof AiProviderError && error.kind === "timeout") {
      return { ok: false, error: "انتهت مهلة خدمة المساعد. يمكنك متابعة تعديل العقار وحفظه." };
    }
    if (error instanceof AiProviderError && error.kind === "invalid_output") {
      return { ok: false, error: "أعاد المساعد نتيجة غير صالحة. حاول مرة أخرى." };
    }
    return { ok: false, error: "تعذّر تشغيل المساعد حالياً. يمكنك متابعة العمل على العقار بشكل طبيعي." };
  }
}
