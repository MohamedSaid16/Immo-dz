"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/lead-validation";
import type {
  SocialActionResult,
  SocialPipelineActionResult,
} from "@/lib/social-publishing/contracts";
import {
  getSocialPublishContext,
  queueSocialPublicationRpc,
  recordSocialPublicationDeliveryRpc,
  markSocialPublicationPublishingRpc,
  prepareSocialPublicationRpc,
  updateSocialPublicationContentRpc,
} from "@/lib/social-publishing/repository";
import { buildSocialPublishRequestedEvent } from "@/lib/social-publishing/events";
import {
  deliverSocialPublishEvent,
  isSocialPublishingConfigured,
} from "@/lib/social-publishing/webhook";
import {
  isSocialChannel,
  validateSocialContent,
} from "@/lib/social-publishing/validation";

function logSocialActionError(operation: string, error: unknown): void {
  if (typeof error === "object" && error !== null && "code" in error) {
    console.error(`[social-action:${operation}]`, {
      code: String(error.code),
    });
    return;
  }

  console.error(`[social-action:${operation}]`, { code: "unexpected" });
}

function databaseErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  if (code === "42501") {
    return "لا يمكن تحضير المحتوى. يجب أن يكون العقار منشورًا ومملوكًا لوكالتك مع صورة غلاف موثوقة.";
  }
  if (code === "55000") {
    return "لا يمكن تعديل هذه المنشورة خارج حالة المسودة.";
  }
  if (code === "22023") {
    return "بيانات النشر الاجتماعي غير صالحة.";
  }
  return "تعذّر حفظ مسودة النشر الاجتماعي. حاول مرة أخرى.";
}

function revalidateSocial(propertyId: string): void {
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  revalidatePath("/dashboard/properties");
}

async function queueAndDeliverSocialPublication(
  publicationId: string,
): Promise<SocialPipelineActionResult> {
  try {
    const queued = await queueSocialPublicationRpc(publicationId);
    if (!queued) {
      return { ok: false, error: "تعذّر إنشاء طلب النشر." };
    }

    revalidateSocial(queued.publication.propertyId);
    const context = await getSocialPublishContext(publicationId, queued.attempt);
    if (!context) {
      console.error("[social-action:publish-context]", { publicationId });
      return { ok: true, result: queued, delivery: "failed" };
    }

    const event = buildSocialPublishRequestedEvent(context);
    if (!isSocialPublishingConfigured()) {
      return { ok: true, result: queued, delivery: "disabled" };
    }

    await recordSocialPublicationDeliveryRpc(
      queued.publication.id,
      queued.attempt.eventId,
    );
    const delivery = await deliverSocialPublishEvent(event);
    if (delivery.status === "sent") {
      try {
        await markSocialPublicationPublishingRpc(
          queued.publication.id,
          queued.attempt.eventId,
        );
      } catch (error) {
        logSocialActionError("mark-publishing", error);
      }
      revalidateSocial(queued.publication.propertyId);
      return { ok: true, result: queued, delivery: "sent" };
    }

    return {
      ok: true,
      result: queued,
      delivery: "failed",
    };
  } catch (error) {
    logSocialActionError("queue", error);
    return { ok: false, error: databaseErrorMessage(error) };
  }
}

export async function prepareSocialPublication(
  propertyId: string,
  channel: unknown,
  content: unknown,
): Promise<SocialActionResult> {
  if (!isUuid(propertyId)) {
    return { ok: false, error: "معرّف العقار غير صالح." };
  }
  if (!isSocialChannel(channel)) {
    return { ok: false, error: "قناة النشر غير مدعومة." };
  }

  const validation = validateSocialContent(channel, content);
  if (!validation.ok) return validation;

  try {
    const publication = await prepareSocialPublicationRpc(
      propertyId,
      channel,
      validation.content,
    );
    if (!publication) {
      return { ok: false, error: "تعذّر قراءة مسودة النشر بعد حفظها." };
    }
    revalidateSocial(propertyId);
    return { ok: true, publication };
  } catch (error) {
    logSocialActionError("prepare", error);
    return { ok: false, error: databaseErrorMessage(error) };
  }
}

export async function updateSocialPublicationContent(
  publicationId: string,
  content: unknown,
): Promise<SocialActionResult> {
  if (!isUuid(publicationId)) {
    return { ok: false, error: "معرّف المسودة غير صالح." };
  }

  // The channel is resolved from the owned database row by the RPC. This
  // action intentionally does not accept a browser-supplied channel or agency.
  if (typeof content !== "string") {
    return { ok: false, error: "محتوى النشر غير صالح." };
  }

  try {
    const publication = await updateSocialPublicationContentRpc(
      publicationId,
      content.trim(),
    );
    if (!publication) {
      return { ok: false, error: "تعذّر قراءة مسودة النشر بعد تحديثها." };
    }
    revalidateSocial(publication.propertyId);
    return { ok: true, publication };
  } catch (error) {
    logSocialActionError("update", error);
    return { ok: false, error: databaseErrorMessage(error) };
  }
}

export async function requestSocialPublication(
  publicationId: string,
): Promise<SocialPipelineActionResult> {
  if (!isUuid(publicationId)) {
    return { ok: false, error: "معرّف المسودة غير صالح." };
  }
  return queueAndDeliverSocialPublication(publicationId);
}

export async function retrySocialPublication(
  publicationId: string,
): Promise<SocialPipelineActionResult> {
  if (!isUuid(publicationId)) {
    return { ok: false, error: "معرّف المنشور غير صالح." };
  }
  return queueAndDeliverSocialPublication(publicationId);
}
