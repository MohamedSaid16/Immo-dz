"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Archive,
  Copy,
  Eye,
  Globe,
  GlobeLock,
  ImageIcon,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import {
  archiveProperty,
  deleteProperty,
  duplicateProperty,
  publishProperty,
  restoreProperty,
  unpublishProperty,
  type PropertyActionResult,
} from "./actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDZD } from "@/lib/utils";
import {
  PROPERTY_TYPE_LABELS,
  STATUS_LABELS,
  TRANSACTION_LABELS,
  type Property,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Filter tabs                                                        */
/* ------------------------------------------------------------------ */

type FilterTab = "all" | "published" | "draft" | "archived";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "published", label: "منشور" },
  { key: "draft", label: "مسودة" },
  { key: "archived", label: "مؤرشف" },
];

function filterProperties(
  properties: Property[],
  tab: FilterTab,
): Property[] {
  switch (tab) {
    case "published":
      return properties.filter((p) => p.isPublished && !p.archivedAt);
    case "draft":
      return properties.filter((p) => !p.isPublished && !p.archivedAt);
    case "archived":
      return properties.filter((p) => !!p.archivedAt);
    default:
      return properties;
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function PhotoPlaceholder({ count }: { count: number }) {
  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
      <ImageIcon className="size-5" />
      {count > 0 && (
        <span className="absolute -bottom-1.5 -left-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function PublishBadge({ property }: { property: Property }) {
  if (property.archivedAt) {
    return (
      <Badge variant="muted" className="gap-1">
        <Archive className="size-3" />
        مؤرشف
      </Badge>
    );
  }
  if (!property.isPublished) {
    return (
      <Badge variant="warning" className="gap-1">
        <GlobeLock className="size-3" />
        مسودة
      </Badge>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Action button with transition                                      */
/* ------------------------------------------------------------------ */

function ActionButton({
  onClick,
  onError,
  icon: Icon,
  label,
  variant = "default",
}: {
  onClick: () => Promise<PropertyActionResult>;
  onError: (message?: string) => void;
  icon: typeof Pencil;
  label: string;
  variant?: "default" | "destructive";
}) {
  const [pending, startTransition] = useTransition();

  function runAction() {
    startTransition(async () => {
      const result = await onClick();
      onError(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={runAction}
      disabled={pending}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground disabled:opacity-50",
        variant === "destructive"
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-secondary hover:text-foreground",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Icon className="size-4" />
      )}
    </button>
  );
}

function DeleteButton({
  id,
  title,
  onError,
  variant = "icon",
}: {
  id: string;
  title: string;
  onError: (message?: string) => void;
  variant?: "icon" | "text";
}) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      window.confirm(`هل أنت متأكد من حذف "${title}"؟ لا يمكن التراجع عن هذا.`)
    ) {
      startTransition(async () => {
        const result = await deleteProperty(id);
        onError(result.error);
      });
    }
  }

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "gap-1 text-destructive hover:bg-destructive/10",
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
        حذف
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label="حذف"
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop actions                                                    */
/* ------------------------------------------------------------------ */

function DesktopActions({
  property,
  onError,
}: {
  property: Property;
  onError: (message?: string) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {/* Preview */}
      <Link
        href={`/dashboard/properties/${property.id}/preview`}
        title="معاينة"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Eye className="size-4" />
      </Link>

      {/* Edit */}
      <Link
        href={`/dashboard/properties/${property.id}/edit`}
        aria-label="تعديل"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Pencil className="size-4" />
      </Link>

      {/* Publish / Unpublish */}
      {!property.archivedAt && (
        property.isPublished ? (
          <ActionButton
            onClick={() => unpublishProperty(property.id)}
            onError={onError}
            icon={GlobeLock}
            label="إلغاء النشر"
          />
        ) : (
          <ActionButton
            onClick={() => publishProperty(property.id)}
            onError={onError}
            icon={Globe}
            label="نشر"
          />
        )
      )}

      {/* Duplicate */}
      <ActionButton
        onClick={() => duplicateProperty(property.id)}
        onError={onError}
        icon={Copy}
        label="تكرار"
      />

      {/* Archive / Restore */}
      {property.archivedAt ? (
        <ActionButton
          onClick={() => restoreProperty(property.id)}
          onError={onError}
          icon={RotateCcw}
          label="استعادة"
        />
      ) : (
        <ActionButton
          onClick={() => archiveProperty(property.id)}
          onError={onError}
          icon={Archive}
          label="أرشفة"
        />
      )}

      {/* Delete */}
      <DeleteButton
        id={property.id}
        title={property.title}
        onError={onError}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function PropertiesTable({ properties }: { properties: Property[] }) {
  const [tab, setTab] = useState<FilterTab>("all");
  const [actionError, setActionError] = useState<string>();
  const filtered = filterProperties(properties, tab);

  const counts = {
    all: properties.length,
    published: properties.filter((p) => p.isPublished && !p.archivedAt).length,
    draft: properties.filter((p) => !p.isPublished && !p.archivedAt).length,
    archived: properties.filter((p) => !!p.archivedAt).length,
  };

  if (properties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          لا توجد عقارات بعد. ابدأ بإضافة عقارك الأول.
        </p>
        <Link
          href="/dashboard/properties/add"
          className={cn(buttonVariants(), "mt-4")}
        >
          إضافة عقار
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {actionError}
        </p>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            <span className="mr-1 text-[10px] text-muted-foreground">
              ({counts[key]})
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            لا توجد عقارات في هذا التصنيف.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-xs text-muted-foreground">
                    <th className="p-4 font-medium">العقار</th>
                    <th className="p-4 font-medium">الولاية</th>
                    <th className="p-4 font-medium">النوع</th>
                    <th className="p-4 font-medium">السعر (دج)</th>
                    <th className="p-4 font-medium">الحالة</th>
                    <th className="p-4 font-medium">المشاهدات</th>
                    <th className="p-4 font-medium text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => {
                    const status = STATUS_LABELS[p.status];
                    return (
                      <tr key={p.id} className="hover:bg-secondary/40">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <PhotoPlaceholder count={p.images} />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">
                                  {p.title}
                                </p>
                                <PublishBadge property={p} />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {TRANSACTION_LABELS[p.transaction]} · {p.area} م²
                                {p.slug && (
                                  <span className="text-primary/60">
                                    {" "}· /{p.slug}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{p.wilaya}</td>
                        <td className="p-4 text-muted-foreground">
                          {PROPERTY_TYPE_LABELS[p.type]}
                        </td>
                        <td className="p-4 font-semibold tabular-nums text-foreground">
                          {formatDZD(p.price)}
                        </td>
                        <td className="p-4">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="p-4 text-center tabular-nums text-muted-foreground">
                          {p.viewsCount}
                        </td>
                        <td className="p-4">
                          <DesktopActions
                            property={p}
                            onError={setActionError}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-border md:hidden">
              {filtered.map((p) => {
                const status = STATUS_LABELS[p.status];
                return (
                  <div key={p.id} className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      <PhotoPlaceholder count={p.images} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {p.title}
                            </p>
                            <PublishBadge property={p} />
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.wilaya} · {PROPERTY_TYPE_LABELS[p.type]} ·{" "}
                          {TRANSACTION_LABELS[p.transaction]}
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums">
                          {formatDZD(p.price)} دج
                        </p>
                        {p.viewsCount > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Eye className="size-3" />
                            {p.viewsCount} مشاهدة
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/properties/${p.id}/edit`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-1",
                        )}
                      >
                        <Pencil className="size-3.5" />
                        تعديل
                      </Link>

                      <Link
                        href={`/dashboard/properties/${p.id}/preview`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-1",
                        )}
                      >
                        <Eye className="size-3.5" />
                        معاينة
                      </Link>

                      {!p.archivedAt && (
                        p.isPublished ? (
                          <ActionButton
                            onClick={() => unpublishProperty(p.id)}
                            onError={setActionError}
                            icon={GlobeLock}
                            label="إلغاء النشر"
                          />
                        ) : (
                          <ActionButton
                            onClick={() => publishProperty(p.id)}
                            onError={setActionError}
                            icon={Globe}
                            label="نشر"
                          />
                        )
                      )}

                      <ActionButton
                        onClick={() => duplicateProperty(p.id)}
                        onError={setActionError}
                        icon={Copy}
                        label="تكرار"
                      />

                      <DeleteButton
                        id={p.id}
                        title={p.title}
                        onError={setActionError}
                        variant="text"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
