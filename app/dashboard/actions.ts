"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth:logout]", { code: error.code ?? "unexpected" });
    throw new Error("تعذّر تسجيل الخروج. يرجى المحاولة مرة أخرى.");
  }
  redirect("/login");
}
