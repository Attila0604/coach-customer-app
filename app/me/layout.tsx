// Layout für den gesamten Mitglieder-Bereich (/me/*). Die "Chrome" (Tab-Leiste
// + unterer Abstand) steuert MeShell — u.a. damit die Workout-Session im
// Vollbild ohne Tab-Leiste läuft. Login-Seiten liegen außerhalb von /me.

import { cookies } from "next/headers";
import MeShell from "@/components/nav/MeShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLocale, type Locale } from "@/lib/i18n";

const SESSION_COOKIE = "coach_customer_id";

export default async function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale: Locale = "de";
  const customerId = cookies().get(SESSION_COOKIE)?.value;
  if (customerId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("customer_profiles")
      .select("language")
      .eq("customer_id", customerId)
      .maybeSingle();
    locale = resolveLocale(data?.language as string | null | undefined);
  }
  return <MeShell locale={locale}>{children}</MeShell>;
}
