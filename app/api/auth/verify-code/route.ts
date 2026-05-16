import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "coach_customer_id";
const SESSION_DURATION_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const { username, code } = await request.json();

    if (!username || !code) {
      return NextResponse.json(
        { error: "Username und Code erforderlich" },
        { status: 400 }
      );
    }

    const normalized = username.replace(/^@/, "").toLowerCase().trim();
    const admin = createAdminClient();

    const { data: customer } = await admin
      .from("customers")
      .select("id, telegram_username")
      .ilike("telegram_username", normalized)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: "Ungültig" }, { status: 401 });
    }

    const { data: magicCode } = await admin
      .from("magic_codes")
      .select("id")
      .eq("customer_id", customer.id)
      .eq("code", String(code).trim())
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!magicCode) {
      return NextResponse.json(
        { error: "Code ungültig oder abgelaufen" },
        { status: 401 }
      );
    }

    await admin
      .from("magic_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", magicCode.id);

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: customer.id,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("verify-code error:", error);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
}
