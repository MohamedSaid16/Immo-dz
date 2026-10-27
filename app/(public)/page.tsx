import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Search, Users } from "lucide-react";
import type { Metadata } from "next";

import { HeroSlider } from "@/components/landing/hero-slider";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { SiteFooter } from "@/components/landing/site-footer";
import { AgencyCta } from "@/components/public/agency-cta";
import { PropertyCard } from "@/components/public/property-card";
import { PropertyMapView } from "@/components/public/property-map-view";
import { buttonVariants } from "@/components/ui/button";
import { getAvailableProperties, getLatestProperties, listAgencies } from "@/lib/properties";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Immo DZ — اكتشف عقارك في الجزائر" },
  description: "عقارات للبيع والإيجار من وكالات عقارية موثوقة في الجزائر.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

const discoveryPanels = [
  {
    title: "عقارات للبيع",
    description: "اختر منزلك القادم واستكشف عروض البيع المتاحة.",
    href: "/biens?transaction=sale",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=82",
  },
  {
    title: "عقارات للإيجار",
    description: "اعثر على مساحة مناسبة لحياتك وعملك.",
    href: "/biens?transaction=rent",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=82",
  },
] as const;

const benefits = [
  { icon: Building2, title: "عقارات من وكالات عقارية", text: "تصفح عروضاً منشورة من وكالات تعمل في السوق الجزائري." },
  { icon: Search, title: "تصفح واضح وسهل", text: "ابحث واكتشف العقارات حسب احتياجاتك دون تعقيد." },
  { icon: Users, title: "تواصل مباشر مع الوكالة", text: "تواصل مع الوكالة مباشرة عندما تجد العقار المناسب." },
] as const;

export default async function LandingPage() {
  const [latest, agencies, available] = await Promise.all([
    getLatestProperties(6),
    listAgencies(12),
    getAvailableProperties(),
  ]);

  return (
    <div className="public-surface overflow-x-clip bg-background text-foreground">
      <LandingNavbar agencies={agencies} />
      <HeroSlider />

      <main>
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24" dir="rtl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">تشكيلة مختارة</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">أحدث العقارات</h2>
            </div>
            <Link href="/biens" className={cn(buttonVariants({ variant: "outline" }), "shrink-0 gap-2")}>عرض الكل <ArrowLeft className="size-4" aria-hidden="true" /></Link>
          </div>
          {latest.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((property) => <PropertyCard key={property.id} property={property} showContact={false} />)}
            </div>
          ) : (
            <div className="border-y border-border py-12 text-center">
              <p className="font-semibold">لا توجد عقارات منشورة حالياً</p>
              <p className="mt-2 text-sm text-muted-foreground">تفضل بزيارة صفحة العقارات لاكتشاف العروض الجديدة.</p>
              <Link href="/biens" className={cn(buttonVariants(), "mt-5")}>استكشف العقارات</Link>
            </div>
          )}
        </section>

        <section className="mx-auto grid max-w-[1400px] gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:pb-24" dir="rtl">
          {discoveryPanels.map((panel) => (
            <Link key={panel.href} href={panel.href} className="group relative min-h-[260px] overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${panel.image})` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220]/85 via-[#0b1220]/20 to-transparent" />
              <div className="relative flex min-h-[260px] flex-col justify-end p-6 text-white sm:p-8">
                <h2 className="text-2xl font-extrabold">{panel.title}</h2>
                <p className="mt-2 max-w-sm text-sm text-white/80">{panel.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white">اكتشف الآن <ArrowLeft className="size-4" aria-hidden="true" /></span>
              </div>
            </Link>
          ))}
        </section>

        <section className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:pb-24" dir="rtl">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-primary">اكتشاف جديد</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">اكتشف العقارات على الخريطة</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">شاهد العقارات المنشورة حسب موقعها، ثم افتح تفاصيل العرض مباشرة.</p></div>
            <Link href="/carte" className={cn(buttonVariants({ variant: "outline" }), "hidden shrink-0 gap-2 sm:inline-flex")}>استكشف الخريطة <MapPin className="size-4" aria-hidden="true" /></Link>
          </div>
          <div className="h-[360px] overflow-hidden rounded-xl border border-border bg-secondary">
            <PropertyMapView properties={available} className="h-full w-full" />
          </div>
          <Link href="/carte" className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full gap-2 sm:hidden")}>استكشف الخريطة <MapPin className="size-4" aria-hidden="true" /></Link>
        </section>

        <section className="border-y border-border bg-secondary/30" dir="rtl">
          <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
            <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">شركاء محليون</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">وكالات عقارية مميزة</h2></div><Link href="/biens" className="text-sm font-bold text-primary hover:underline">استكشف العقارات</Link></div>
            {agencies.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{agencies.slice(0, 8).map((agency) => <Link key={agency.id} href={`/agences/${agency.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-4 transition-colors hover:border-primary/50"><span className="font-bold">{agency.name}</span><span className="text-xs text-muted-foreground">{agency.wilaya}</span></Link>)}</div> : <p className="text-sm text-muted-foreground">ستظهر الوكالات هنا قريباً.</p>}
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24" dir="rtl">
          <div className="mb-8"><p className="text-sm font-semibold text-primary">لماذا Immo DZ؟</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">طريقة أوضح لاكتشاف العقار</h2></div>
          <div className="grid gap-8 md:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 text-primary"><Icon className="size-5" aria-hidden="true" /></div><div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div></div>)}</div>
        </section>

        <AgencyCta />
      </main>
      <SiteFooter />
    </div>
  );
}
