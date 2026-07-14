import { redirect } from "next/navigation";

import { DashboardShell } from "./dashboard-shell";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[dashboard:authentication]", {
      code: authError.code ?? "unexpected",
    });
    redirect("/login");
  }

  // Belt-and-braces: the proxy already guards /dashboard, but re-check here.
  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, agency_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[dashboard:profile]", {
      code: profileError.code ?? "unexpected",
    });
    throw new Error("تعذّر تحميل بيانات الحساب.");
  }

  let agencyName: string =
    profile?.full_name ?? user.email ?? "وكالتي";

  if (profile?.agency_id) {
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", profile.agency_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (agencyError) {
      console.error("[dashboard:agency]", {
        code: agencyError.code ?? "unexpected",
      });
      throw new Error("تعذّر تحميل بيانات الوكالة.");
    }
    if (agency?.name) agencyName = agency.name;
  }

  return <DashboardShell agencyName={agencyName}>{children}</DashboardShell>;
}
