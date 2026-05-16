import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username erforderlich" },
        { status: 400 }
      );
    }

    const normalized = username.replace(/^@/, "").toLowerCase().trim();
    const admin = createAdminClient();

    // Customer per Telegram-Username finden
    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("id, telegram_chat_id, telegram_username")
      .ilike("telegram_username", normalized)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Username nicht gefunden. Schreib zuerst dem Bot." },
        { status: 401 }
      );
    }

    if (!customer.telegram_chat_id) {
      return NextResponse.json(
        { error: "Telegram-Chat fehlt. Schreib zuerst dem Bot." },
        { status: 400 }
      );
    }

    // 6-stelligen Code generieren
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Gültig für 5 Minuten
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Code in magic_codes speichern
    const { error: insertError } = await admin
      .from("magic_codes")
      .insert({
        customer_id: customer.id,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Insert magic_code failed:", insertError);
      return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
    }

    // Code via Telegram senden
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN missing");
      return NextResponse.json(
        { error: "Server-Konfiguration unvollständig" },
        { status: 500 }
      );
    }

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: customer.telegram_chat_id,
          text: `🔐 Dein Login-Code: *${code}*\n\nGültig für 5 Minuten.`,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!tgRes.ok) {
      const tgError = await tgRes.text();
      console.error("Telegram send failed:", tgError);
      return NextResponse.json(
        { error: "Code konnte nicht via Telegram zugestellt werden" },
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
