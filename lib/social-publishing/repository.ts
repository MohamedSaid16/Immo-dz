import { createClient } from "@/lib/supabase/server";

import {
  SOCIAL_CHANNELS,
  SOCIAL_PUBLICATION_STATUSES,
  type SocialChannel,
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
