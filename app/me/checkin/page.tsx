import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import AppHeader from "@/components/nav/AppHeader";
import { viennaMondayKey } from "@/lib/date";
import CheckinForm from "@/components/checkin/CheckinForm";
import { getDict, LOCALE_TAG, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import type { CheckinInput } from "@/lib/actions/checkin";

const SESSION_COOKIE = "coach_customer_id";

function formatWeek(mondayIso: string, locale: Locale): string {
  const monday = new Date(`${mondayIso}T12:00:00Z`);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString(LOCALE_TAG[locale], {
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
  const locale = await getLocale();
  const d = getDict(locale);
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
      <AppHeader title={d.checkin.title} eyebrow={d.checkin.eyebrow} />
      <main className="min-h-screen px-6 pt-6 max-w-md mx-auto">

      <section className="mb-10 text-center">
        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          {d.checkin.heading}
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed">
          {d.checkin.weekPrefix} {formatWeek(weekOf, locale)} · {d.checkin.optionalAll}.
        </p>
      </section>

      <section className="border-t border-white/[0.08] pt-8">
        <CheckinForm initial={initial} alreadyCheckedIn={!!existing} locale={locale} />
      </section>
    </main>
    </>
  );
}
