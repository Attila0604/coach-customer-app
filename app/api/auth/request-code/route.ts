import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

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

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("id, telegram_chat_id, telegram_username, first_name, user_id")
      .ilike("telegram_username", normalized)
      .maybeSingle();

    if (customerError || !customer) {
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

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: syntheticEmail,
      });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error("Generate link failed:", linkError);
      return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
    }

    // Response upfront erstellen — Cookies hängen wir HIER dran
    const response = NextResponse.json({ ok: true });

    // Supabase-Client der Cookies direkt an unsere response setzt
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

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

    return response;
  } catch (error) {
    console.error("verify-code error:", error);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
}
