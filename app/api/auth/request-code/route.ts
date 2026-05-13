import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username erforderlich" },
        { status: 400 }
      );
    }

    // Username normalisieren: @ entfernen, lowercase, trim
    const normalized = username.replace(/^@/, "").toLowerCase().trim();
    if (!normalized) {
      return NextResponse.json(
        { error: "Username erforderlich" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Kunde case-insensitiv per Username finden
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, telegram_chat_id, telegram_username, first_name")
      .ilike("telegram_username", normalized)
      .maybeSingle();

    if (customerError) {
      console.error("Customer lookup error:", customerError);
      return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
    }
    if (!customer) {
      return NextResponse.json(
        { error: "Kein Account gefunden. Schreib zuerst dem Bot." },
        { status: 404 }
      );
    }

    // 6-stelligen Code generieren
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 Min

    const { error: insertError } = await supabase.from("magic_codes").insert({
      customer_id: customer.id,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Insert magic_code failed:", insertError);
      return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
    }

    // Via Telegram Bot API senden
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN!;
    const message = `🔐 Dein Login-Code: <b>${code}</b>\n\nGültig für 5 Minuten.`;

    const tgResponse = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: customer.telegram_chat_id,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!tgResponse.ok) {
      const errText = await tgResponse.text();
      console.error("Telegram send failed:", errText);
      return NextResponse.json(
        { error: "Code konnte nicht gesendet werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      username: customer.telegram_username,
    });
  } catch (error) {
    console.error("request-code error:", error);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
}
