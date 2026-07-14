"use client";

import { useRef, useState } from "react";
import { ImagePlus, Info, Loader2, Star, X } from "lucide-react";

import { setPropertyCover } from "@/app/dashboard/properties/actions";
import type { PropertyImage } from "@/lib/types";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 3.5 * 1024 * 1024;
const SERVER_MAX_IMAGES = 8;

type Uploading = {
  tempId: string;
  name: string;
  progress: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function errorMessage(value: unknown, fallback: string): string {
  const message = asRecord(value)?.error;
  return typeof message === "string" ? message : fallback;
}

function parseUploadedPhoto(value: unknown): PropertyImage | null {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.url !== "string" ||
    typeof record.isCover !== "boolean"
  ) {
    return null;
  }

  return {
    id: record.id,
    url: record.url,
    isCover: record.isCover,
    thumbnailUrl:
      typeof record.thumbnailUrl === "string" ? record.thumbnailUrl : null,
  };
}

function uploadWithProgress(
  file: File,
  propertyId: string,
  onProgress: (percent: number) => void,
): Promise<PropertyImage> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("propertyId", propertyId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const response: unknown = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const photo = parseUploadedPhoto(response);
          if (photo) {
            resolve(photo);
            return;
          }
          reject(new Error("استجابة رفع الصورة غير صالحة."));
          return;
        }
        reject(new Error(errorMessage(response, "فشل الرفع.")));
      } catch {
        reject(new Error("فشل الرفع."));
      }
    };
    xhr.onerror = () => reject(new Error("فشل الاتصال بالخادم."));
    xhr.send(form);
  });
}

export function PhotoUpload({
  propertyId,
  initialPhotos = [],
  max = SERVER_MAX_IMAGES,
}: {
  propertyId?: string;
  initialPhotos?: PropertyImage[];
  max?: number;
}) {
  const [photos, setPhotos] = useState<PropertyImage[]>(initialPhotos);
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [covering, setCovering] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!propertyId) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        احفظ العقار أولًا، وسيتم نقلك إلى صفحة التعديل لإضافة الصور.
      </div>
    );
  }

  const limit = Math.min(Math.max(max, 1), SERVER_MAX_IMAGES);
  const total = photos.length + uploads.length;
  const canAddMore = total < limit;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !propertyId) return;
    setError(null);
    setWarning(null);

    const files = Array.from(fileList).slice(
      0,
      limit - photos.length - uploads.length,
    );

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("صيغة غير مدعومة (JPG / PNG / WEBP فقط).");
        continue;
      }
      if (file.size === 0) {
        setError("ملف الصورة فارغ.");
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError("حجم الصورة يتجاوز 3.5 ميغابايت.");
        continue;
      }

      const tempId = crypto.randomUUID();
      setUploads((current) => [
        ...current,
        { tempId, name: file.name, progress: 0 },
      ]);

      try {
        const photo = await uploadWithProgress(file, propertyId, (progress) =>
          setUploads((current) =>
            current.map((upload) =>
              upload.tempId === tempId ? { ...upload, progress } : upload,
            ),
          ),
        );

        setPhotos((current) => [
          ...current.map((item) =>
            photo.isCover ? { ...item, isCover: false } : item,
          ),
          photo,
        ]);
      } catch (uploadError) {
        setError(
          uploadError instanceof Error ? uploadError.message : "فشل الرفع.",
        );
      } finally {
        setUploads((current) =>
          current.filter((upload) => upload.tempId !== tempId),
        );
      }
    }
  }

  async function removePhoto(id: string) {
    setDeleting(id);
    setError(null);
    setWarning(null);

    try {
      const response = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(errorMessage(data, "فشل الحذف."));
      }

      const record = asRecord(data);
      const coverId = typeof record?.coverId === "string" ? record.coverId : null;
      const responseWarning =
        typeof record?.warning === "string" ? record.warning : null;

      setPhotos((current) =>
        current
          .filter((photo) => photo.id !== id)
          .map((photo) => ({
            ...photo,
            isCover: photo.id === coverId,
          })),
      );
      setWarning(responseWarning);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "فشل الحذف.",
      );
    } finally {
      setDeleting(null);
    }
  }

  async function makeCover(imageId: string) {
    if (!propertyId) return;

    setCovering(imageId);
    setError(null);
    setWarning(null);

    try {
      const result = await setPropertyCover(propertyId, imageId);
      if (result.error) {
        setError(result.error);
        return;
      }

      setPhotos((current) =>
        current.map((photo) => ({
          ...photo,
          isCover: photo.id === imageId,
        })),
      );
    } catch {
      setError("تعذر تعيين صورة الغلاف. يرجى المحاولة مرة أخرى.");
    } finally {
      setCovering(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      {warning && (
        <p
          role="status"
          className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300"
        >
          {warning}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`صورة العقار ${index + 1}`}
              loading="lazy"
              className="size-full object-cover"
            />

            {photo.isCover ? (
              <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                <Star className="size-3 fill-current" />
                الغلاف
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void makeCover(photo.id)}
                disabled={covering !== null || deleting !== null}
                aria-label={`تعيين الصورة ${index + 1} كغلاف`}
                title="تعيين كغلاف"
                className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-primary group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
              >
                {covering === photo.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Star className="size-3.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => void removePhoto(photo.id)}
              disabled={deleting !== null || covering !== null}
              aria-label={`حذف الصورة ${index + 1}`}
              className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
            >
              {deleting === photo.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
            </button>
          </div>
        ))}

        {uploads.map((upload) => (
          <div
            key={upload.tempId}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-border bg-secondary p-2 text-muted-foreground"
          >
            <Loader2 className="size-5 animate-spin" />
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${upload.progress}%` }}
              />
            </div>
            <span className="max-w-full truncate text-[10px]">
              {upload.name} · {upload.progress}%
            </span>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ImagePlus className="size-6" />
            <span className="text-xs font-medium">إضافة صورة</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <p className="text-xs text-muted-foreground">
        {photos.length} / {limit} صور — اختر صورة الغلاف بواسطة زر النجمة. الصيغ
        المدعومة: JPG، PNG، WEBP (حتى 3.5 ميغابايت).
      </p>
    </div>
  );
}
