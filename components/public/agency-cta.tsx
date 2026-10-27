import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AgencyCta() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:pb-24" dir="rtl">
      <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-[#111111] bg-[#111111] px-6 py-8 text-white sm:flex-row sm:items-center sm:px-8">
        <div><p className="text-sm font-semibold text-white/75">للوكالات العقارية</p><h2 className="mt-2 text-2xl font-extrabold">نمّ حضور وكالتك وأدر عقاراتك وعملاءك من مكان واحد.</h2></div>
        <div className="flex shrink-0 flex-wrap gap-3"><Link href="/register" className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-[#111111] hover:bg-[#f4f4f4]">اكتشف فضاء الوكالات <ArrowLeft className="size-4" aria-hidden="true" /></Link><Link href="/login" className="inline-flex h-10 items-center rounded-md border border-white/30 px-5 text-sm font-bold text-white hover:bg-white/10">تسجيل الدخول</Link></div>
      </div>
    </section>
  );
}
