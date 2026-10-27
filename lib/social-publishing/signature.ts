import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 300;

export function createSocialSignature(
  rawBody: string,
  timestamp: string,
  secret: string,
): string {
  return `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex")}`;
}

export function isFreshSocialTimestamp(
  timestamp: string,
  now = Date.now(),
): boolean {
  const seconds = Number(timestamp);
  if (!Number.isInteger(seconds) || seconds <= 0) return false;
  return Math.abs(Math.floor(now / 1000) - seconds) <= MAX_CLOCK_SKEW_SECONDS;
}

export function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = Buffer.from(actual, "utf8");
  return (
    expectedBytes.length === actualBytes.length &&
    timingSafeEqual(expectedBytes, actualBytes)
  );
}

