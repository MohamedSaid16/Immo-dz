"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { updateRecoveredPassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updateRecoveredPassword,
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
          تعيين كلمة مرور جديدة
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          اختر كلمة مرور جديدة لحساب وكالتك.
        </p>
      </div>

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
          <Label
            htmlFor="password"
            className="text-slate-700 dark:text-slate-300"
          >
            كلمة المرور الجديدة
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            minLength={6}
            maxLength={72}
            required
            className="h-12 rounded-xl border-slate-200 px-4 transition-colors focus:border-[#B5121B] focus:ring-[#B5121B] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="passwordConfirmation"
            className="text-slate-700 dark:text-slate-300"
          >
            تأكيد كلمة المرور الجديدة
          </Label>
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            minLength={6}
            maxLength={72}
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
          {pending ? "جاري تحديث كلمة المرور..." : "تحديث كلمة المرور"}
        </Button>
      </form>
    </motion.div>
  );
}
