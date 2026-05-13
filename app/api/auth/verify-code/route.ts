import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

    // Kunde finden
    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("id, telegram_chat_id, telegram_username, first_name, user_id")
      .ilike("telegram_username", normalized)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Ungültig" }, { status: 401 });
    }

    // Code suchen (offen + nicht abgelaufen)
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

    // Code als benutzt markieren
    await admin
      .from("magic_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", magicCode.id);

    // Auth-User sicherstellen
    const syntheticEmail = `tg-${customer.telegram_chat_id}@coach.local`;

    if (!customer.user_id) {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email: syntheticEmail,
          email_confirm: true,
          user_metadata: {
            customer_id: customer.id,
            telegram_username: customer.telegram_username,
            first_name: customer.first_name,
          },
        });

      if (createError || !created.user) {
        console.error("Create user failed:", createError);
        return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
      }

      await admin
        .from("customers")
        .update({ user_id: created.user.id })
        .eq("id", customer.id);
    }

    // Magic-Link generieren (für Session-Erstellung)
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: syntheticEmail,
      });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error("Generate link failed:", linkError);
      return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
    }

    // OTP server-seitig verifizieren — setzt Session-Cookies
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("Verify OTP failed:", verifyError);
      return NextResponse.json(
        { error: "Login fehlgeschlagen" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("verify-code error:", error);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
}
