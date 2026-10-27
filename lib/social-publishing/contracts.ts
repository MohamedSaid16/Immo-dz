export const SOCIAL_CHANNELS = ["facebook", "instagram"] as const;

export type SocialChannel = (typeof SOCIAL_CHANNELS)[number];

export const SOCIAL_PUBLICATION_STATUSES = [
  "draft",
  "queued",
  "publishing",
  "published",
  "failed",
] as const;

export type SocialPublicationStatus =
  (typeof SOCIAL_PUBLICATION_STATUSES)[number];

export type SocialPublication = {
  id: string;
  agencyId: string;
  propertyId: string;
  channel: SocialChannel;
  status: SocialPublicationStatus;
  approvedContent: string;
  externalPostId: string | null;
  externalPostUrl: string | null;
  requestedAt: string | null;
  publishedAt: string | null;
  lastErrorCode: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SocialActionResult =
  | { ok: true; publication: SocialPublication }
  | { ok: false; error: string };

export type SocialPublicationAttempt = {
  id: string;
  publicationId: string;
  eventId: string;
  attemptNo: number;
  status: Exclude<SocialPublicationStatus, "draft">;
  deliveryAttemptCount: number;
  requestedAt: string;
  completedAt: string | null;
  lastErrorCode: string | null;
};

export type SocialPublishRequestedEvent = {
  version: 1;
  eventId: string;
  eventType: "social.publish_requested";
  occurredAt: string;
  agencyId: string;
  propertyId: string;
  publicationId: string;
  channel: SocialChannel;
  content: string;
  canonicalUrl: string;
  coverImageUrl: string;
};

export type SocialQueueResult = {
  publication: SocialPublication;
  attempt: SocialPublicationAttempt;
};

export type SocialPipelineActionResult =
  | { ok: true; result: SocialQueueResult; delivery: "sent" | "disabled" | "failed" }
  | { ok: false; error: string };
