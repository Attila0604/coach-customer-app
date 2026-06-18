import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "coach_customer_id";
const SESSION_DURATION_DAYS = 30;

// Ein-Klick-Login über den Token-Link aus den Telegram-Nachrichten.
// Token gültig -> Session-Cookie setzen und in den Mitglieder-Bereich leiten.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const loginUrl = new URL("/login", req.url);

  if (!token) {
    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("login_tokens")
      .select("customer_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      loginUrl.searchParams.set("error", "expired");
      return NextResponse.redirect(loginUrl);
    }

    const response = NextResponse.redirect(new URL("/me", req.url));
    response.cookies.set({
      name: SESSION_COOKIE,
      value: row.customer_id as string,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });
    return response;
  } catch {
    loginUrl.searchParams.set("error", "server");
    return NextResponse.redirect(loginUrl);
  }
}
