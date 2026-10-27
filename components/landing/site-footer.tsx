import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { listAgencies } from "@/lib/properties";

const propertyLinks = [
  ["للبيع", "/biens?transaction=sale"],
  ["للإيجار", "/biens?transaction=rent"],
  ["كل العقارات", "/biens"],
  ["الخريطة", "/carte"],
] as const;

export async function SiteFooter() {
  const agencies = await listAgencies(6);
  return (
    <footer id="contact" dir="rtl" className="bg-[#0b1220] text-white/70">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Immo DZ" className="h-9 w-auto" />
            <span className="text-lg font-extrabold text-white">Immo<span className="text-primary"> DZ</span></span>
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-white/55">منصة جزائرية تساعدك على اكتشاف العقارات والتواصل مع الوكالات العقارية الموثوقة بسهولة ووضوح.</p>
          <Link href="/register" className="inline-flex text-sm font-bold text-white hover:text-[#b5121b]">سجّل وكالتك ←</Link>
        </div>
        <div className="space-y-4"><h2 className="text-sm font-bold text-white">العقارات</h2><ul className="space-y-2.5 text-sm">{propertyLinks.map(([label, href]) => <li key={href}><Link href={href} className="transition-colors hover:text-[#b5121b]">{label}</Link></li>)}</ul></div>
        <div className="space-y-4"><h2 className="text-sm font-bold text-white">للوكالات</h2><ul className="space-y-2.5 text-sm"><li><Link href="/login" className="hover:text-[#b5121b]">فضاء الوكالات</Link></li><li><Link href="/register" className="hover:text-[#b5121b]">تسجيل وكالة</Link></li></ul>{agencies.length > 0 && <div className="pt-2"><p className="mb-2 text-xs font-semibold text-white/45">وكالات على المنصة</p><div className="space-y-1.5">{agencies.slice(0, 3).map((agency) => <Link key={agency.id} href={`/agences/${agency.id}`} className="block truncate text-xs hover:text-[#b5121b]">{agency.name}</Link>)}</div></div>}</div>
        <div className="space-y-4"><h2 className="text-sm font-bold text-white">تواصل معنا</h2><ul className="space-y-3 text-sm"><li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />الجزائر، الجزائر</li><li className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-primary" aria-hidden="true" /><span dir="ltr">+213 555 21 44 08</span></li><li className="flex items-center gap-2"><Mail className="size-4 shrink-0 text-primary" aria-hidden="true" /><span dir="ltr">contact@immo-dz.com</span></li></ul></div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/40 sm:flex-row sm:px-6"><p>© {new Date().getFullYear()} Immo DZ — جميع الحقوق محفوظة.</p><p>منصة مخصصة للوكالات العقارية الجزائرية</p></div></div>
    </footer>
  );
}
