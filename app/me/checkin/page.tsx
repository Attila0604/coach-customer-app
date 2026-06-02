import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import AppHeader from "@/components/nav/AppHeader";
import { viennaMondayKey } from "@/lib/date";
import CheckinForm from "@/components/checkin/CheckinForm";
import type { CheckinInput } from "@/lib/actions/checkin";

const SESSION_COOKIE = "coach_customer_id";

function formatWeekDe(mondayIso: string): string {
  const monday = new Date(`${mondayIso}T12:00:00Z`);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Europe/Vienna",
    });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export default async function CheckinPage() {
  const customerId = cookies().get(SESSION_COOKIE)?.value;
  if (!customerId) redirect("/");

  const admin = createAdminClient();
  const weekOf = viennaMondayKey(new Date());

  const { data: existing } = await admin
    .from("checkins")
    .select("weight_kg, waist_cm, mood_rating, energy_rating, sleep_rating, notes")
    .eq("customer_id", customerId)
    .eq("week_of", weekOf)
    .maybeSingle();

  const initial: CheckinInput = {
    weight_kg: existing?.weight_kg != null ? Number(existing.weight_kg) : null,
    waist_cm: existing?.waist_cm != null ? Number(existing.waist_cm) : null,
    mood_rating: existing?.mood_rating ?? null,
    energy_rating: existing?.energy_rating ?? null,
    sleep_rating: existing?.sleep_rating ?? null,
    notes: existing?.notes ?? null,
  };

  return (
    <>
      <AppHeader title="Check-in" eyebrow="Wöchentlich" />
      <main className="min-h-screen px-6 pt-6 max-w-md mx-auto">

      <section className="mb-10">
        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          Wie war deine Woche?
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed">
          Woche {formatWeekDe(weekOf)} · alle Felder optional.
        </p>
      </section>

      <section className="border-t border-white/[0.08] pt-8">
        <CheckinForm initial={initial} alreadyCheckedIn={!!existing} />
      </section>
    </main>
    </>
  );
}
