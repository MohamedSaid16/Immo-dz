"use client";

import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

export function HeroSlider() {
  return (
    <section
      dir="rtl"
      className="relative h-[560px] w-full overflow-hidden bg-[#0b1220] sm:h-[680px]"
      aria-labelledby="hero-title"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=2200&q=85)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-l from-[#0b1220]/85 via-[#0b1220]/45 to-[#0b1220]/20" />
      <div className="relative mx-auto flex h-full max-w-[1400px] items-center px-4 sm:px-6">
        <div className="max-w-2xl text-white">
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/80">السوق العقاري الجزائري</p>
          <h1 id="hero-title" className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">اكتشف عقارك القادم</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-xl">عقارات للبيع والإيجار من وكالات عقارية موثوقة في الجزائر.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/biens" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#111111] px-7 text-sm font-bold text-white transition-colors hover:bg-[#333333]">استكشف العقارات <ArrowLeft className="size-4" aria-hidden="true" /></Link>
            <Link href="/carte" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/45 px-7 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white/10"><MapPin className="size-4" aria-hidden="true" /> عرض على الخريطة</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
