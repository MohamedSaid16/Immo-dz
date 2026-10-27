import { isUuid } from "@/lib/lead-validation";
import { applySocialPublicationResultRpc } from "@/lib/social-publishing/repository";
import {
  createSocialSignature,
  isFreshSocialTimestamp,
  signaturesMatch,
} from "@/lib/social-publishing/signature";

type CallbackPayload = {
  version?: unknown;
  eventId?: unknown;
  publicationId?: unknown;
  status?: unknown;
  externalPostId?: unknown;
  externalPostUrl?: unknown;
  errorCode?: unknown;
};

function invalidResponse(): Response {
  return Response.json({ error: "Invalid social publication callback." }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.N8N_PUBLISH_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "Social publishing callback is disabled." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length === 0 || rawBody.length > 64 * 1024) return invalidResponse();

  const timestamp = request.headers.get("x-immo-timestamp") ?? "";
  const signature = request.headers.get("x-immo-signature") ?? "";
  const headerEventId = request.headers.get("x-immo-event-id") ?? "";
  if (!isFreshSocialTimestamp(timestamp)) return invalidResponse();

  const expectedSignature = createSocialSignature(rawBody, timestamp, secret);
  if (!signature || !signaturesMatch(expectedSignature, signature)) {
    return Response.json({ error: "Invalid callback signature." }, { status: 401 });
  }

  let payload: CallbackPayload;
  try {
    payload = JSON.parse(rawBody) as CallbackPayload;
  } catch {
    return invalidResponse();
  }

  const eventId = typeof payload.eventId === "string" ? payload.eventId : "";
  const publicationId = typeof payload.publicationId === "string"
    ? payload.publicationId
    : "";
  const status = payload.status;
  if (
    payload.version !== 1 ||
    !isUuid(eventId) ||
    !isUuid(publicationId) ||
    eventId !== headerEventId ||
    (status !== "published" && status !== "failed")
  ) {
    return invalidResponse();
  }

  const externalPostId = typeof payload.externalPostId === "string"
    ? payload.externalPostId
    : undefined;
  const externalPostUrl = typeof payload.externalPostUrl === "string"
    ? payload.externalPostUrl
    : undefined;
  const errorCode = typeof payload.errorCode === "string"
    ? payload.errorCode
    : undefined;
  const hasExternalPostId = Object.prototype.hasOwnProperty.call(payload, "externalPostId");
  const hasExternalPostUrl = Object.prototype.hasOwnProperty.call(payload, "externalPostUrl");
  const hasErrorCode = Object.prototype.hasOwnProperty.call(payload, "errorCode");

  if (externalPostId && externalPostId.length > 255) return invalidResponse();
  if (externalPostUrl && externalPostUrl.length > 2048) return invalidResponse();
  if (errorCode && !/^[A-Za-z0-9_.:-]{1,100}$/.test(errorCode)) {
    return invalidResponse();
  }

  if (status === "published") {
    if (!externalPostId || !externalPostUrl || hasErrorCode) {
      return invalidResponse();
    }
  }
  if (status === "failed") {
    if (!errorCode || hasExternalPostId || hasExternalPostUrl) {
      return invalidResponse();
    }
  }

  try {
    await applySocialPublicationResultRpc({
      eventId,
      publicationId,
      status,
      externalPostId,
      externalPostUrl,
      errorCode,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "unexpected";
    console.warn("[social-callback] rejected", { code });
    return Response.json({ error: "The social publication result was rejected." }, { status: 409 });
  }
}
