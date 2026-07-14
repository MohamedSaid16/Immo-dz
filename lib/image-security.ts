import "server-only";

import sharp from "sharp";

export const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_PROPERTY_IMAGES = 8;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
export type PropertyImageExtension = "jpg" | "png" | "webp";

const UUID_SOURCE =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_PATTERN = new RegExp(`^${UUID_SOURCE}$`, "i");
const PROPERTY_PHOTO_KEY_PATTERN = new RegExp(
  `^(${UUID_SOURCE})/(${UUID_SOURCE})\\.(jpg|png|webp)$`,
);

const FORMAT_BY_TYPE: Record<AllowedImageType, "jpeg" | "png" | "webp"> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const EXTENSION_BY_TYPE: Record<AllowedImageType, PropertyImageExtension> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class ImageValidationError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = "ImageValidationError";
  }
}

export function isAllowedImageType(type: string): type is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.some((allowedType) => allowedType === type);
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function createPropertyPhotoKey(
  propertyId: string,
  extension: PropertyImageExtension,
): string {
  if (!isUuid(propertyId)) {
    throw new ImageValidationError("معرّف العقار غير صالح.");
  }
  return `${propertyId.toLowerCase()}/${crypto.randomUUID()}.${extension}`;
}

export function parsePropertyPhotoKey(
  key: string,
): { propertyId: string; imageId: string; extension: PropertyImageExtension } | null {
  const match = PROPERTY_PHOTO_KEY_PATTERN.exec(key);
  if (!match) return null;

  return {
    propertyId: match[1],
    imageId: match[2],
    extension: match[3] as PropertyImageExtension,
  };
}

export async function validateAndNormalizeImage(
  input: Buffer,
  declaredType: AllowedImageType,
): Promise<{
  bytes: Buffer;
  contentType: AllowedImageType;
  extension: PropertyImageExtension;
}> {
  if (input.length === 0) {
    throw new ImageValidationError("ملف الصورة فارغ.");
  }
  if (input.length > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("حجم الصورة يتجاوز 3.5 ميغابايت.");
  }

  try {
    const source = sharp(input, {
      animated: false,
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    });
    const metadata = await source.metadata();
    const expectedFormat = FORMAT_BY_TYPE[declaredType];

    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) !== 1
    ) {
      throw new ImageValidationError(
        "محتوى الملف لا يطابق صيغة الصورة المعلنة.",
      );
    }

    const normalizedSource = sharp(input, {
      animated: false,
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).rotate();

    const bytes =
      declaredType === "image/jpeg"
        ? await normalizedSource.jpeg({ quality: 88, mozjpeg: true }).toBuffer()
        : declaredType === "image/png"
          ? await normalizedSource.png({ compressionLevel: 9 }).toBuffer()
          : await normalizedSource.webp({ quality: 88 }).toBuffer();

    if (bytes.length > MAX_IMAGE_BYTES) {
      throw new ImageValidationError(
        "حجم الصورة بعد التحقق يتجاوز 3.5 ميغابايت.",
      );
    }

    return {
      bytes,
      contentType: declaredType,
      extension: EXTENSION_BY_TYPE[declaredType],
    };
  } catch (error) {
    if (error instanceof ImageValidationError) throw error;
    throw new ImageValidationError("ملف الصورة تالف أو غير صالح.");
  }
}
