"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { loginAgency } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = { passwordUpdated: boolean; registrationPending: boolean };

export function LoginForm({ passwordUpdated, registrationPending }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAgency, undefined);
  return (
    <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-[#1E293B] dark:shadow-none">
      <div className="space-y-2 text-center">
        <p className="text-sm font-bold text-primary">فضاء الوكالات العقارية</p>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">تسجيل دخول الوكالة</h2>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">إدارة عقاراتك وعملائك وتسويق وكالتك من مكان واحد.</p>
      </div>
      <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-xs leading-relaxed text-slate-600 dark:text-slate-300">لا تحتاج إلى حساب لتصفح العقارات أو التواصل مع الوكالات.</p>
      {registrationPending && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول.</div>}
      {passwordUpdated && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />تم تحديث كلمة المرور بنجاح.</div>}
      {state?.error && <div role="alert" className="rounded-xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-center text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">{state.error}</div>}
      <form action={formAction} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><Input id="email" name="email" type="email" dir="ltr" autoComplete="email" placeholder="agency@email.com" required /></div>
        <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">كلمة المرور</Label><Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">نسيت كلمة المرور؟</Link></div><Input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" required /></div>
        <Button type="submit" size="lg" className="h-12 w-full font-semibold" disabled={pending}>{pending && <Loader2 className="me-2 animate-spin" />}{pending ? "جارٍ تسجيل الدخول..." : "تسجيل دخول الوكالة"}</Button>
      </form>
      <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800"><Link href="/biens" className="font-semibold text-primary hover:underline">تصفح العقارات</Link><p className="text-slate-500 dark:text-slate-400">ليس لديك حساب وكالة؟ <Link href="/register" className="font-semibold text-foreground hover:underline dark:text-primary">سجّل وكالتك</Link></p></div>
    </div>
  );
}
