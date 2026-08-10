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
