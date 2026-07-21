"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";

import { getAbsoluteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { WILAYAS } from "@/lib/wilayas";

export type AuthState = { error?: string } | undefined;
export type PasswordRecoveryState =
  | { error?: string; success?: string }
  | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALGERIAN_PHONE_PATTERN = /^(?:0[2-7]\d{7,8}|\+213[2-7]\d{7,8})$/;
const WILAYA_NAMES = new Set(WILAYAS.map((wilaya) => wilaya.name));

function translateAuthError(error: AuthError): string {
  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }
  if (message.includes("email not confirmed")) {
    return "يرجى تأكيد بريدك الإلكتروني أولًا.";
  }
  if (
    message.includes("already registered") ||
    message.includes("already been registered")
  ) {
    return "هذا البريد الإلكتروني مسجّل بالفعل.";
  }
  if (message.includes("password")) {
    return "كلمة المرور ضعيفة جدًا (6 أحرف على الأقل).";
  }
  if (message.includes("rate limit")) {
    return "تم تجاوز عدد المحاولات المسموح. يرجى الانتظار قليلًا ثم المحاولة مجددًا.";
  }

  return "حدث خطأ أثناء المصادقة. يرجى المحاولة مرة أخرى.";
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePhone(value: FormDataEntryValue | null): string {
  const phone = String(value ?? "")
    .trim()
    .replace(/[\s().-]/g, "")
    .replace(/^00213/, "+213");

  return phone;
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

function isValidAlgerianPhone(phone: string): boolean {
  return ALGERIAN_PHONE_PATTERN.test(phone);
}

function metadataValue(
  metadata: Record<string, unknown>,
  key: string,
): string {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

async function ensureAgencyProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: {
    agencyName: string;
    wilaya: string;
    phone: string;
    ownerName: string;
  },
): Promise<string | null> {
  const { error } = await supabase.rpc("ensure_agency_for_current_user", {
    agency_name: values.agencyName,
    agency_wilaya: values.wilaya,
    contact_phone: values.phone,
    contact_full_name: values.ownerName,
  });

  if (!error) {
    return null;
  }

  console.error("Failed to initialize agency profile", {
    code: error.code ?? "unexpected",
  });

  if (error.code === "PGRST202") {
    return "تعذر تهيئة حساب الوكالة لأن قاعدة البيانات غير محدثة. طبّق هجرات Phase 0A ثم أعد المحاولة.";
  }

  return "تم تسجيل الدخول، لكن تعذر تهيئة ملف الوكالة. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.";
}

export async function registerAgency(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const agencyName = String(formData.get("agencyName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const phone = normalizePhone(formData.get("phone"));
  const wilaya = String(formData.get("wilaya") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!agencyName || !ownerName || !email || !phone || !wilaya || !password) {
    return { error: "يرجى ملء جميع الحقول المطلوبة." };
  }
  if (agencyName.length > 120) {
    return { error: "اسم الوكالة طويل جدًا." };
  }
  if (ownerName.length > 100) {
    return { error: "اسم المالك طويل جدًا." };
  }
  if (!isValidEmail(email)) {
    return { error: "يرجى إدخال بريد إلكتروني صالح." };
  }
  if (!isValidAlgerianPhone(phone)) {
    return { error: "يرجى إدخال رقم هاتف جزائري صالح." };
  }
  if (!WILAYA_NAMES.has(wilaya)) {
    return { error: "يرجى اختيار ولاية صالحة من القائمة." };
  }
  if (password.length < 6) {
    return { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." };
  }
  if (password.length > 72) {
    return { error: "كلمة المرور طويلة جدًا." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: ownerName,
        phone,
        agency_name: agencyName,
        wilaya,
      },
    },
  });

  if (error) {
    return { error: translateAuthError(error) };
  }

  if (!data.user) {
    return {
      error: "تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى.",
    };
  }

  if (data.session) {
    const setupError = await ensureAgencyProfile(supabase, {
      agencyName,
      wilaya,
      phone,
      ownerName,
    });

    if (setupError) {
      return { error: setupError };
    }

    redirect("/dashboard");
  }

  redirect("/login?registered=1");
}

export async function loginAgency(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
    };
  }
  if (!isValidEmail(email)) {
    return { error: "يرجى إدخال بريد إلكتروني صالح." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: translateAuthError(error) };
  }

  const metadata: Record<string, unknown> = data.user.user_metadata;
  const setupError = await ensureAgencyProfile(supabase, {
    agencyName: metadataValue(metadata, "agency_name"),
    wilaya: metadataValue(metadata, "wilaya"),
    phone: metadataValue(metadata, "phone"),
    ownerName: metadataValue(metadata, "full_name"),
  });

  if (setupError) {
    return { error: setupError };
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(
  _prev: PasswordRecoveryState,
  formData: FormData,
): Promise<PasswordRecoveryState> {
  const email = normalizeEmail(formData.get("email"));

  if (!email || !isValidEmail(email)) {
    return { error: "يرجى إدخال بريد إلكتروني صالح." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAbsoluteUrl("/auth/callback"),
  });

  if (error) {
    console.error("Failed to request password recovery", {
      code: error.code ?? "unexpected",
    });

    if (error.message.toLowerCase().includes("rate limit")) {
      return {
        error:
          "تم تجاوز عدد محاولات الاسترجاع المسموح. يرجى الانتظار قليلاً ثم المحاولة مجدداً.",
      };
    }

    return {
      error: "تعذر إرسال رابط الاسترجاع حالياً. يرجى المحاولة مرة أخرى.",
    };
  }

  return {
    success:
      "إذا كان البريد مسجلاً، ستصلك رسالة تحتوي على رابط آمن لتعيين كلمة مرور جديدة.",
  };
}

export async function updateRecoveredPassword(
  _prev: PasswordRecoveryState,
  formData: FormData,
): Promise<PasswordRecoveryState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? "",
  );

  if (!password || !passwordConfirmation) {
    return { error: "يرجى إدخال كلمة المرور الجديدة وتأكيدها." };
  }
  if (password.length < 6) {
    return { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." };
  }
  if (password.length > 72) {
    return { error: "كلمة المرور طويلة جداً." };
  }
  if (password !== passwordConfirmation) {
    return { error: "كلمتا المرور غير متطابقتين." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error:
        "انتهت صلاحية رابط الاسترجاع أو أنه غير صالح. اطلب رابطاً جديداً وحاول مجدداً.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Failed to update recovered password", {
      code: error.code ?? "unexpected",
    });
    return { error: translateAuthError(error) };
  }

  const { error: signOutError } = await supabase.auth.signOut({
    scope: "local",
  });
  if (signOutError) {
    console.error("Failed to clear password recovery session", {
      code: signOutError.code ?? "unexpected",
    });
  }

  redirect("/login?passwordUpdated=1");
}
