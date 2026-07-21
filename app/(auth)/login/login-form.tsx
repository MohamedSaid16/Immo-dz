"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { loginAgency } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  passwordUpdated: boolean;
  registrationPending: boolean;
};

export function LoginForm({
  passwordUpdated,
  registrationPending,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAgency, undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-[#1E293B] dark:shadow-none"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
          تسجيل الدخول
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          أدخل بياناتك للوصول إلى لوحة تحكم وكالتك.
        </p>
      </div>

      {registrationPending && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده، ثم سجّل الدخول.
          </span>
        </motion.div>
      )}

      {passwordUpdated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.</span>
        </motion.div>
      )}

      {state?.error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          role="alert"
          className="rounded-xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-center text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
        >
          {state.error}
        </motion.div>
      )}

      <form action={formAction} className="mt-4 space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-slate-700 dark:text-slate-300"
          >
            البريد الإلكتروني
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="agency@email.com"
            required
            className="h-12 rounded-xl border-slate-200 px-4 transition-colors focus:border-[#C9A227] focus:ring-[#C9A227] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-slate-700 dark:text-slate-300"
            >
              كلمة المرور
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#C9A227] transition-colors hover:text-[#0F172A] dark:hover:text-white"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="h-12 rounded-xl border-slate-200 px-4 transition-colors focus:border-[#C9A227] focus:ring-[#C9A227] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl bg-[#0F172A] font-semibold text-white shadow-md transition-all hover:bg-[#0F172A]/90 dark:bg-[#C9A227] dark:text-[#0F172A] dark:hover:bg-[#C9A227]/90"
          disabled={pending}
        >
          {pending && <Loader2 className="me-2 animate-spin" />}
          {pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </Button>
      </form>

      <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="font-semibold text-[#0F172A] hover:underline dark:text-[#C9A227]"
          >
            سجّل وكالتك
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
