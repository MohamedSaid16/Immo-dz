import {
  SOCIAL_CHANNELS,
  type SocialChannel,
} from "./contracts";

export const SOCIAL_CONTENT_LIMITS: Record<SocialChannel, number> = {
  facebook: 2000,
  instagram: 1500,
};

const UNSAFE_CONTENT_PATTERN = /<[^>]*>|javascript:|data:text\/html|https?:\/\/|www\./i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

export function isSocialChannel(value: unknown): value is SocialChannel {
  return (
    typeof value === "string" &&
    (SOCIAL_CHANNELS as readonly string[]).includes(value)
  );
}

export function validateSocialContent(
  channel: SocialChannel,
  value: unknown,
): { ok: true; content: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "محتوى النشر غير صالح." };
  }

  const content = value.trim();
  if (!content) {
    return { ok: false, error: "أدخل محتوى قبل حفظ المسودة." };
  }

  if (content.length > SOCIAL_CONTENT_LIMITS[channel]) {
    const channelLabel = channel === "facebook" ? "Facebook" : "Instagram";
    return {
      ok: false,
      error: `محتوى ${channelLabel} يجب ألا يتجاوز ${SOCIAL_CONTENT_LIMITS[channel]} حرف.`,
    };
  }

  if (UNSAFE_CONTENT_PATTERN.test(content) || CONTROL_CHARACTER_PATTERN.test(content)) {
    return { ok: false, error: "يحتوي المحتوى على HTML أو رابط أو رموز غير مسموحة." };
  }

  return { ok: true, content };
}
