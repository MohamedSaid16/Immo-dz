import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

import {
  SOCIAL_CHANNELS,
  SOCIAL_PUBLICATION_STATUSES,
  type SocialChannel,
  type SocialPublicationAttempt,
  type SocialQueueResult,
  type SocialPublication,
} from "./contracts";

type SocialPublicationRow = {
  id: string;
  agency_id: string;
  property_id: string;
  channel: string;
  status: string;
  approved_content: string;
  external_post_id: string | null;
  external_post_url: string | null;
  requested_at: string | null;
  published_at: string | null;
  last_error_code: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
};

type SocialAttemptRow = {
  id: string;
  publication_id: string;
  event_id: string;
  attempt_no: number;
  status: string;
  delivery_attempt_count: number;
  requested_at: string;
  completed_at: string | null;
  last_error_code: string | null;
};

function isChannel(value: string): value is SocialChannel {
  return (SOCIAL_CHANNELS as readonly string[]).includes(value);
}

function isStatus(value: string): value is SocialPublication["status"] {
  return (SOCIAL_PUBLICATION_STATUSES as readonly string[]).includes(value);
}

function mapPublication(row: SocialPublicationRow): SocialPublication | null {
  if (!isChannel(row.channel) || !isStatus(row.status)) return null;

  return {
    id: row.id,
    agencyId: row.agency_id,
    propertyId: row.property_id,
    channel: row.channel,
    status: row.status,
    approvedContent: row.approved_content,
    externalPostId: row.external_post_id,
    externalPostUrl: row.external_post_url,
    requestedAt: row.requested_at,
    publishedAt: row.published_at,
    lastErrorCode: row.last_error_code,
    retryCount: Number(row.retry_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttempt(row: SocialAttemptRow): SocialPublicationAttempt | null {
  if (!(["queued", "publishing", "published", "failed"] as string[]).includes(row.status)) {
    return null;
  }
  return {
    id: row.id,
    publicationId: row.publication_id,
    eventId: row.event_id,
    attemptNo: Number(row.attempt_no),
    status: row.status as SocialPublicationAttempt["status"],
    deliveryAttemptCount: Number(row.delivery_attempt_count ?? 0),
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    lastErrorCode: row.last_error_code,
  };
}

function logSocialRepositoryError(operation: string, error: { code?: string }): void {
  console.error(`[social:${operation}]`, {
    code: error.code ?? "unexpected",
  });
}

const SOCIAL_PUBLICATION_SELECT = `
  id, agency_id, property_id, channel, status, approved_content,
  external_post_id, external_post_url, requested_at, published_at,
  last_error_code, retry_count, created_at, updated_at
`;

export async function getSocialPublications(
  propertyId: string,
  agencyId: string,
): Promise<SocialPublication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_publications")
    .select(SOCIAL_PUBLICATION_SELECT)
    .eq("property_id", propertyId)
    .eq("agency_id", agencyId)
    .order("channel", { ascending: true });

  if (error) {
    logSocialRepositoryError("read", error);
    throw new Error("تعذّر تحميل إعدادات النشر الاجتماعي.");
  }

  return (data as SocialPublicationRow[])
    .map(mapPublication)
    .filter((publication): publication is SocialPublication => publication !== null);
}

function firstRpcPublication(value: unknown): SocialPublication | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (typeof row !== "object" || row === null || Array.isArray(row)) return null;
  return mapPublication(row as SocialPublicationRow);
}

function firstRpcRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  return typeof row === "object" && row !== null && !Array.isArray(row)
    ? (row as Record<string, unknown>)
    : null;
}

function mapQueueResult(value: unknown): SocialQueueResult | null {
  const row = firstRpcRow(value);
  if (!row) return null;
  const publication = mapPublication({
    id: String(row.publication_id),
    agency_id: String(row.agency_id),
    property_id: String(row.property_id),
    channel: String(row.channel),
    status: String(row.publication_status),
    approved_content: String(row.approved_content),
    external_post_id: null,
    external_post_url: null,
    requested_at: null,
    published_at: null,
    last_error_code: null,
    retry_count: 0,
    created_at: "",
    updated_at: "",
  });
  const attempt = mapAttempt({
    id: String(row.attempt_id),
    publication_id: String(row.publication_id),
    event_id: String(row.event_id),
    attempt_no: Number(row.attempt_no),
    status: String(row.attempt_status),
    delivery_attempt_count: Number(row.delivery_attempt_count ?? 0),
    requested_at: new Date().toISOString(),
    completed_at: null,
    last_error_code: null,
  });
  if (!publication || !attempt) return null;
  return { publication, attempt };
}

export async function prepareSocialPublicationRpc(
  propertyId: string,
  channel: SocialChannel,
  content: string,
): Promise<SocialPublication | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("prepare_social_publication", {
    target_property_id: propertyId,
    target_channel: channel,
    target_content: content,
  });

  if (error) {
    logSocialRepositoryError("prepare", error);
    throw error;
  }

  return firstRpcPublication(data);
}

export async function updateSocialPublicationContentRpc(
  publicationId: string,
  content: string,
): Promise<SocialPublication | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_social_publication_content", {
    target_publication_id: publicationId,
    target_content: content,
  });

  if (error) {
    logSocialRepositoryError("update", error);
    throw error;
  }

  return firstRpcPublication(data);
}

export async function queueSocialPublicationRpc(
  publicationId: string,
): Promise<SocialQueueResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("queue_social_publication", {
    target_publication_id: publicationId,
  });
  if (error) {
    logSocialRepositoryError("queue", error);
    throw error;
  }
  return mapQueueResult(data);
}

export async function recordSocialPublicationDeliveryRpc(
  publicationId: string,
  eventId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("record_social_publication_delivery", {
    target_publication_id: publicationId,
    target_event_id: eventId,
  });
  if (error) {
    logSocialRepositoryError("delivery-attempt", error);
    throw error;
  }
}

export async function markSocialPublicationPublishingRpc(
  publicationId: string,
  eventId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("mark_social_publication_publishing", {
    target_publication_id: publicationId,
    target_event_id: eventId,
  });
  if (error) {
    logSocialRepositoryError("mark-publishing", error);
    throw error;
  }
}

export async function getSocialPublishContext(
  publicationId: string,
  attempt: SocialPublicationAttempt,
): Promise<{
  publication: SocialPublication;
  attempt: SocialPublicationAttempt;
  propertySlug: string | null;
  coverImageUrl: string;
} | null> {
  const supabase = await createClient();
  const { data: publicationRow, error: publicationError } = await supabase
    .from("social_publications")
    .select(SOCIAL_PUBLICATION_SELECT)
    .eq("id", publicationId)
    .maybeSingle();
  if (publicationError) {
    logSocialRepositoryError("publish-context", publicationError);
    throw publicationError;
  }
  const publication = publicationRow
    ? mapPublication(publicationRow as unknown as SocialPublicationRow)
    : null;
  if (!publication) return null;

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, slug, agency_id")
    .eq("id", publication.propertyId)
    .eq("agency_id", publication.agencyId)
    .maybeSingle();
  if (propertyError) {
    logSocialRepositoryError("publish-property", propertyError);
    throw propertyError;
  }

  const { data: cover, error: coverError } = await supabase
    .from("property_images")
    .select("url")
    .eq("property_id", publication.propertyId)
    .eq("is_cover", true)
    .maybeSingle();
  if (coverError) {
    logSocialRepositoryError("publish-cover", coverError);
    throw coverError;
  }
  if (!property || !cover?.url) return null;

  return {
    publication,
    attempt,
    propertySlug: property.slug,
    coverImageUrl: cover.url,
  };
}

export async function applySocialPublicationResultRpc(input: {
  eventId: string;
  publicationId: string;
  status: "published" | "failed";
  externalPostId?: string;
  externalPostUrl?: string;
  errorCode?: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("apply_social_publication_result", {
    target_event_id: input.eventId,
    target_publication_id: input.publicationId,
    target_status: input.status,
    target_external_post_id: input.externalPostId ?? null,
    target_external_post_url: input.externalPostUrl ?? null,
    target_error_code: input.errorCode ?? null,
  });
  if (error) {
    logSocialRepositoryError("result", error);
    throw error;
  }
}
