import { createSocialSignature } from "./signature";
import type { SocialPublishRequestedEvent } from "./contracts";

type SocialPublishingConfig = {
  enabled: boolean;
  webhookUrl: string | null;
  secret: string | null;
  timeoutMs: number;
};

export type SocialDeliveryResult =
  | { status: "disabled"; reason: "disabled" | "misconfigured" }
  | { status: "sent" }
  | { status: "failed"; errorCode: string };

function getSocialPublishingConfig(): SocialPublishingConfig {
  const enabled = process.env.SOCIAL_PUBLISHING_ENABLED === "true";
  const webhookUrl = process.env.N8N_PUBLISH_WEBHOOK_URL?.trim() || null;
  const secret = process.env.N8N_PUBLISH_WEBHOOK_SECRET?.trim() || null;
  const configuredTimeout = Number(process.env.SOCIAL_PUBLISHING_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(Math.max(Math.floor(configuredTimeout), 1000), 10000)
    : 5000;

  return { enabled, webhookUrl, secret, timeoutMs };
}

function isValidWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSocialPublishingConfigured(): boolean {
  const config = getSocialPublishingConfig();
  return Boolean(
    config.enabled &&
      config.webhookUrl &&
      config.secret &&
      isValidWebhookUrl(config.webhookUrl),
  );
}

export async function deliverSocialPublishEvent(
  event: SocialPublishRequestedEvent,
): Promise<SocialDeliveryResult> {
  const config = getSocialPublishingConfig();
  if (!config.enabled) return { status: "disabled", reason: "disabled" };
  if (!config.webhookUrl || !config.secret || !isValidWebhookUrl(config.webhookUrl)) {
    console.warn("[social-webhook] delivery disabled: invalid configuration");
    return { status: "disabled", reason: "misconfigured" };
  }

  const rawBody = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createSocialSignature(rawBody, timestamp, config.secret);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-immo-event-id": event.eventId,
        "x-immo-timestamp": timestamp,
        "x-immo-signature": signature,
      },
      body: rawBody,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn("[social-webhook] delivery rejected", {
        eventId: event.eventId,
        status: response.status,
      });
      return { status: "failed", errorCode: `HTTP_${response.status}` };
    }
    return { status: "sent" };
  } catch (error) {
    const errorCode = error instanceof Error && error.name === "AbortError"
      ? "TIMEOUT"
      : "NETWORK_ERROR";
    console.warn("[social-webhook] delivery failed", {
      eventId: event.eventId,
      errorCode,
    });
    return { status: "failed", errorCode };
  } finally {
    clearTimeout(timeout);
  }
}
