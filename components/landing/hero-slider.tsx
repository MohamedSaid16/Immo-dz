"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&q=80",
    title: "منصتك العقارية المتكاملة في الجزائر",
    subtitle: "Trouvez, vendez et gérez vos biens — le tout au même endroit.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1920&q=80",
    title: "آلاف العقارات في 58 ولاية",
    subtitle: "Appartements, villas, locaux et terrains partout en Algérie.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920&q=80",
    title: "من الوكالات الموثوقة مباشرة إليك",
    subtitle: "Contactez les meilleures agences par téléphone ou WhatsApp.",
  },
];

export function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      4000,
    );
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[active];

  return (
    <section
      dir="ltr"
      className="relative h-[600px] w-full overflow-hidden bg-[#0f0f1a]"
      aria-roledescription="carousel"
    >
      {/* Crossfading background images */}
      {SLIDES.map((s, i) => (
        <div
          key={i}
          aria-hidden={i !== active}
          className={cn(
            "absolute inset-0 h-full w-full bg-cover bg-center transition-opacity duration-1000",
            i === active ? "opacity-100" : "opacity-0",
          )}
          style={{ backgroundImage: `url(${s.image})` }}
        />
      ))}

      {/* Dark overlay (0.55) */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="pointer-events-none absolute -left-24 top-10 size-96 rounded-full bg-[#c9a84c]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-[#c9a84c]/15 blur-3xl" />

      {/* Content — title + subtitle + two CTAs */}
      <div className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 text-center">
        <h1
          key={`t-${active}`}
          className="text-3xl font-bold leading-tight tracking-tight text-[#f5f0e8] drop-shadow-md sm:text-5xl"
        >
          {slide.title}
        </h1>
        <p
          key={`s-${active}`}
          className="mx-auto mt-5 max-w-2xl text-base text-[#f5f0e8]/80 sm:text-lg"
        >
          {slide.subtitle}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/biens"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[#c9a84c] px-7 text-sm font-semibold text-[#1a1a2e] shadow-lg shadow-black/20 transition-colors hover:bg-[#e8d5a3]"
          >
            Découvrir les biens
            <ArrowLeft className="size-4" />
          </Link>
          <Link
            href="/carte"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-[#c9a84c] px-7 text-sm font-semibold text-[#f5f0e8] transition-colors hover:bg-[#c9a84c] hover:text-[#1a1a2e]"
          >
            <MapPin className="size-4" />
            Voir sur la carte
          </Link>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`الشريحة ${i + 1}`}
            aria-current={i === active}
            className={cn(
              "h-2 rounded-full transition-all",
              i === active
                ? "w-8 bg-[#c9a84c]"
                : "w-2 bg-[#f5f0e8]/50 hover:bg-[#f5f0e8]/80",
            )}
          />
        ))}
      </div>
    </section>
  );
}
