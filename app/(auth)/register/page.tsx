"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { registerAgency } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WILAYAS } from "@/lib/wilayas";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAgency, undefined);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6 bg-white dark:bg-[#1E293B] p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
          إنشاء حساب وكالة
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          سجّل وكالتك وابدأ في إدارة عقاراتك وعملائك من لوحة تحكم واحدة.
        </p>
      </div>

      {state?.error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          role="alert"
          className="rounded-xl border border-red-200/60 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 text-center"
        >
          {state.error}
        </motion.div>
      )}

      <form action={formAction} className="space-y-5 mt-4">
        <div className="space-y-2">
          <Label htmlFor="agencyName" className="text-slate-700 dark:text-slate-300">اسم الوكالة</Label>
          <Input
            id="agencyName"
            name="agencyName"
            placeholder="وكالة الأمل العقارية"
            required
            className="h-12 px-4 rounded-xl border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227] dark:bg-slate-900 dark:border-slate-700 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerName" className="text-slate-700 dark:text-slate-300">اسم المالك</Label>
          <Input 
            id="ownerName" 
            name="ownerName" 
            placeholder="محمد" 
            required 
            className="h-12 px-4 rounded-xl border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227] dark:bg-slate-900 dark:border-slate-700 transition-colors"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">البريد الإلكتروني</Label>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              placeholder="agency@email.com"
              required
              className="h-12 px-4 rounded-xl border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227] dark:bg-slate-900 dark:border-slate-700 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">رقم الهاتف</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              dir="ltr"
              placeholder="0555 12 34 56"
              required
              className="h-12 px-4 rounded-xl border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227] dark:bg-slate-900 dark:border-slate-700 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wilaya" className="text-slate-700 dark:text-slate-300">الولاية</Label>
          <select
            id="wilaya"
            name="wilaya"
            required
            defaultValue=""
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:border-[#C9A227] focus-visible:ring-1 focus-visible:ring-[#C9A227] dark:bg-slate-900 dark:border-slate-700 transition-colors"
          >
            <option value="" disabled>
              اختر الولاية
            </option>
            {WILAYAS.map((w) => (
              <option key={w.code} value={w.name}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">كلمة المرور</Label>
          <Input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            placeholder="••••••••"
            required
            className="h-12 px-4 rounded-xl border-slate-200 focus:border-[#C9A227] focus:ring-[#C9A227] dark:bg-slate-900 dark:border-slate-700 transition-colors"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            6 أحرف على الأقل.
          </p>
        </div>

        <Button 
          type="submit" 
          size="lg" 
          className="w-full h-12 rounded-xl bg-[#0F172A] hover:bg-[#0F172A]/90 dark:bg-[#C9A227] dark:hover:bg-[#C9A227]/90 dark:text-[#0F172A] font-semibold text-white transition-all shadow-md mt-2"
          disabled={pending}
        >
          {pending && <Loader2 className="animate-spin mr-2" />}
          {pending ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
        </Button>
      </form>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-semibold text-[#0F172A] dark:text-[#C9A227] hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
