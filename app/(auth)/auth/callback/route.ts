import { NextResponse } from "next/server";

import { getAbsoluteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      getAbsoluteUrl("/forgot-password?error=invalid"),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Failed to exchange password recovery code", {
      code: error.code ?? "unexpected",
    });
    return NextResponse.redirect(
      getAbsoluteUrl("/forgot-password?error=invalid"),
    );
  }

  return NextResponse.redirect(getAbsoluteUrl("/reset-password"));
}
