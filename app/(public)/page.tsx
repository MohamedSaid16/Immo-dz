import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { HeroSearch } from "@/components/landing/hero-search";
import { HeroSlider } from "@/components/landing/hero-slider";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { SiteFooter } from "@/components/landing/site-footer";
import { PropertyCard } from "@/components/public/property-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

import { getLatestProperties, listAgencies } from "@/lib/properties";

export const metadata: Metadata = {
  title: { absolute: "Immo DZ — La plateforme immobilière algérienne | منصة العقارات الجزائرية" },
  description:
    "Trouvez votre bien en Algérie : appartements, villas, locaux et terrains à vendre ou à louer. ابحث عن عقارك في كل الولايات الجزائرية.",
  alternates: { canonical: "/" },
};

// Reads live data per request (latest properties + agencies).
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [latest, agencies] = await Promise.all([
    getLatestProperties(4),
    listAgencies(12),
  ]);

  return (
    <div className="overflow-x-clip bg-background text-foreground">
      <LandingNavbar agencies={agencies} />

      {/* Hero + search */}
      <HeroSlider />
      <HeroSearch />

      {/* Latest properties */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4" dir="ltr">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Derniers biens
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              أحدث العقارات المضافة
            </h2>
          </div>
          <Link
            href="/biens"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "shrink-0 gap-1.5",
            )}
          >
            Voir tout
            <ArrowLeft className="size-4" />
          </Link>
        </div>

        {latest.length > 0 ? (
          <div dir="rtl" className="grid gap-5 sm:grid-cols-2">
            {latest.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="font-semibold text-foreground">
              لا توجد عقارات منشورة بعد
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              كن أول من ينشر — سجّل وكالتك وأضف عقاراتك.
            </p>
            <Link
              href="/register"
              className={cn(buttonVariants(), "mt-4")}
            >
              سجّل وكالتك
            </Link>
          </div>
        )}
      </section>

      {/* About banner — full-bleed image with dark overlay */}
      <section
        dir="ltr"
        className="relative bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80)",
        }}
      >
        <div className="absolute inset-0 bg-[#0f0f1a]/70" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="max-w-xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c9a84c]">
              À propos
            </p>
            <h2 className="text-3xl font-bold leading-snug text-[#f5f0e8] sm:text-4xl">
              Découvrez Agence Chaabane Internationale
            </h2>
            <p className="max-w-lg leading-relaxed text-[#f5f0e8]/80">
              شريكك العقاري الموثوق في الجزائر. نرافقك في كل خطوة — من البحث عن
              العقار المناسب إلى إتمام الصفقة، بخبرة واحترافية وشفافية كاملة.
            </p>
            <Link
              href="/biens"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#c9a84c] px-6 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#e8d5a3]"
            >
              Voir nos biens
              <ArrowLeft className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
