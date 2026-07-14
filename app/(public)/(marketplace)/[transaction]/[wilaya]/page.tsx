import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PropertyCard } from "@/components/public/property-card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { searchProperties } from "@/lib/properties";
import {
  getAbsoluteUrl,
  getTransactionWilayaPath,
} from "@/lib/site-url";
import { TRANSACTION_LABELS, type TransactionType } from "@/lib/types";
import { WILAYAS } from "@/lib/wilayas";

type PublicTransaction = "vente" | "location";

interface SearchPageProps {
  params: Promise<{ transaction: string; wilaya: string }>;
}

function parseTransaction(value: string): PublicTransaction | null {
  const normalized = value.toLowerCase();
  return normalized === "vente" || normalized === "location"
    ? normalized
    : null;
}

function parseWilaya(value: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  return WILAYAS.some((wilaya) => wilaya.name === decoded) ? decoded : null;
}

function toDatabaseTransaction(transaction: PublicTransaction): TransactionType {
  return transaction === "vente" ? "sale" : "rent";
}

export async function generateMetadata({
  params,
}: SearchPageProps): Promise<Metadata> {
  const raw = await params;
  const transaction = parseTransaction(raw.transaction);
  const wilaya = parseWilaya(raw.wilaya);

  if (!transaction || !wilaya) return { title: "Page introuvable" };

  const isSale = transaction === "vente";
  const transLabel = isSale ? "Achat" : "Location";
  const transLabelAr = isSale ? "شراء عقارات" : "كراء عقارات";
  const title = `${transLabel} immobilier à ${wilaya} | ${transLabelAr} في ${wilaya}`;
  const description = `Découvrez les meilleures offres pour ${transLabel.toLowerCase()} d'appartements, villas et locaux à ${wilaya}. ابحث عن أفضل عروض ${transLabelAr} في ${wilaya}.`;
  const canonicalUrl = getAbsoluteUrl(
    getTransactionWilayaPath(transaction, wilaya),
  );

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SearchLandingPage({ params }: SearchPageProps) {
  const raw = await params;
  const transaction = parseTransaction(raw.transaction);
  const wilaya = parseWilaya(raw.wilaya);

  if (!transaction || !wilaya) notFound();

  const dbTransaction = toDatabaseTransaction(transaction);
  const properties = await searchProperties({
    wilaya,
    transaction: dbTransaction,
  });

  const breadcrumbs = [
    { label: "البحث", href: "/biens" },
    { label: `${TRANSACTION_LABELS[dbTransaction]} عقارات في ${wilaya}` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:py-8">
      <Breadcrumbs items={breadcrumbs} />

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {TRANSACTION_LABELS[dbTransaction]} عقارات في {wilaya}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground" dir="ltr">
          {transaction === "vente" ? "Achat" : "Location"} immobilier à {wilaya}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
        {properties.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
            لا توجد عقارات متاحة حالياً في هذه المنطقة.
          </div>
        )}
      </div>
    </div>
  );
}
