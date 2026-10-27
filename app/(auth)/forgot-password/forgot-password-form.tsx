"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { requestPasswordReset } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ForgotPasswordFormProps = {
  recoveryLinkInvalid: boolean;
};

export function ForgotPasswordForm({
  recoveryLinkInvalid,
}: ForgotPasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    undefined,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-[#1E293B] dark:shadow-none"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
          استرجاع كلمة المرور
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          أدخل بريد حساب الوكالة وسنرسل لك رابطاً آمناً لتعيين كلمة مرور جديدة.
        </p>
      </div>

      {recoveryLinkInvalid && !state?.success && (
        <div
          role="alert"
          className="rounded-xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-center text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
        >
          رابط الاسترجاع غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.
        </div>
      )}

      {state?.success && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.success}</span>
        </div>
      )}

      {state?.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-center text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
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
            className="h-12 rounded-xl border-slate-200 px-4 transition-colors focus:border-[#B5121B] focus:ring-[#B5121B] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <Button
          type="submit"
          size="lg"
            className="h-12 w-full rounded-xl bg-[#111111] font-semibold text-white shadow-md transition-all hover:bg-[#333333]"
          disabled={pending}
        >
          {pending && <Loader2 className="me-2 animate-spin" />}
          {pending ? "جاري إرسال الرابط..." : "إرسال رابط الاسترجاع"}
        </Button>
      </form>

      <p className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        تذكرت كلمة المرور؟{" "}
        <Link
          href="/login"
            className="font-semibold text-[#111111] hover:underline"
        >
          العودة إلى تسجيل الدخول
        </Link>
      </p>
    </motion.div>
  );
}
