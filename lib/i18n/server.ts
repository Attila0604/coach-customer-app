// Server-seitiger Helfer: liest die Sprache des eingeloggten Kunden aus
// customer_profiles.language. Nur in Server-Komponenten verwenden.

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLocale, type Locale } from "@/lib/i18n";

const SESSION_COOKIE = "coach_customer_id";

export async function getLocale(): Promise<Locale> {
  const customerId = cookies().get(SESSION_COOKIE)?.value;
  if (!customerId) return "de";
  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_profiles")
    .select("language")
    .eq("customer_id", customerId)
    .maybeSingle();
  return resolveLocale(data?.language as string | null | undefined);
}
