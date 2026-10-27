"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { registerAgency } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WILAYAS } from "@/lib/wilayas";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAgency, undefined);
  return (
    <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-[#1E293B] dark:shadow-none">
      <div className="space-y-2 text-center"><p className="text-sm font-bold text-primary">فضاء الوكالات العقارية</p><h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">إنشاء حساب وكالة عقارية</h2><p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">ابدأ إدارة عقاراتك وعملائك من لوحة واحدة.</p></div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-xs leading-relaxed text-slate-600 dark:text-slate-300">هذا التسجيل مخصص للوكالات العقارية.<br />للبحث عن عقار لا تحتاج إلى إنشاء حساب.</div>
      {state?.error && <div role="alert" className="rounded-xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-center text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">{state.error}</div>}
      <form action={formAction} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="agencyName">اسم الوكالة</Label><Input id="agencyName" name="agencyName" placeholder="وكالة الأمل العقارية" required /></div>
        <div className="space-y-2"><Label htmlFor="ownerName">اسم المالك</Label><Input id="ownerName" name="ownerName" placeholder="محمد" required /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><Input id="email" name="email" type="email" dir="ltr" placeholder="agency@email.com" required /></div><div className="space-y-2"><Label htmlFor="phone">رقم الهاتف</Label><Input id="phone" name="phone" type="tel" dir="ltr" placeholder="0555 12 34 56" required /></div></div>
        <div className="space-y-2"><Label htmlFor="wilaya">الولاية</Label><select id="wilaya" name="wilaya" required defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="" disabled>اختر الولاية</option>{WILAYAS.map((w) => <option key={w.code} value={w.name}>{w.code} — {w.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="password">كلمة المرور</Label><Input id="password" name="password" type="password" dir="ltr" required /><p className="text-xs text-muted-foreground">6 أحرف على الأقل.</p></div>
        <Button type="submit" size="lg" className="h-12 w-full font-semibold" disabled={pending}>{pending && <Loader2 className="me-2 animate-spin" />}{pending ? "جارٍ إنشاء الوكالة..." : "تسجيل وكالة جديدة"}</Button>
      </form>
      <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800"><Link href="/biens" className="font-semibold text-primary hover:underline">تصفح العقارات</Link><p className="text-slate-500 dark:text-slate-400">لديك حساب وكالة؟ <Link href="/login" className="font-semibold text-foreground hover:underline dark:text-primary">تسجيل الدخول</Link></p></div>
    </div>
  );
}
