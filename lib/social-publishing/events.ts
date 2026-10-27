import {
  getSocialPropertyUrl,
  getPropertyPhotoKey,
  isTrustedPropertyPhotoUrl,
} from "@/lib/site-url";
import type {
  SocialPublication,
  SocialPublishRequestedEvent,
  SocialPublicationAttempt,
} from "./contracts";

export type SocialPublishContext = {
  publication: SocialPublication;
  attempt: SocialPublicationAttempt;
  propertySlug: string | null;
  coverImageUrl: string;
};

export function buildSocialPublishRequestedEvent(
  context: SocialPublishContext,
): SocialPublishRequestedEvent {
  const coverKey = getPropertyPhotoKey(context.coverImageUrl);
  if (
    !isTrustedPropertyPhotoUrl(context.coverImageUrl) ||
    !coverKey?.startsWith(`${context.publication.propertyId}/`)
  ) {
    throw new Error("A trusted property cover image is required.");
  }

  const identifier = context.propertySlug || context.publication.propertyId;
  return {
    version: 1,
    eventId: context.attempt.eventId,
    eventType: "social.publish_requested",
    occurredAt: new Date().toISOString(),
    agencyId: context.publication.agencyId,
    propertyId: context.publication.propertyId,
    publicationId: context.publication.id,
    channel: context.publication.channel,
    content: context.publication.approvedContent,
    canonicalUrl: getSocialPropertyUrl(identifier, context.publication.channel),
    coverImageUrl: context.coverImageUrl,
  };
}
