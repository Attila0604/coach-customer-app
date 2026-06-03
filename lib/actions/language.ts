"use server";

// Server-Action: speichert die gewählte Sprache des eingeloggten Kunden in
// customer_profiles.language (einzige Quelle der Wahrheit). Wird vom
// Sprach-Umschalter aufgerufen.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLocale, type Locale } from "@/lib/i18n";

const SESSION_COOKIE = "coach_customer_id";

export async function setLanguage(locale: Locale): Promise<void> {
  const safe = resolveLocale(locale);
  const customerId = cookies().get(SESSION_COOKIE)?.value;
  if (!customerId) return;

  const admin = createAdminClient();
  await admin
    .from("customer_profiles")
    .update({ language: safe })
    .eq("customer_id", customerId);

  // Layout (Tab-Leiste) + Seiteninhalte neu rendern
  revalidatePath("/me", "layout");
}
