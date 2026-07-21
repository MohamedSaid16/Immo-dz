import { redirect } from "next/navigation";

import { ResetPasswordForm } from "./reset-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/forgot-password?error=invalid");
  }

  return <ResetPasswordForm />;
}
