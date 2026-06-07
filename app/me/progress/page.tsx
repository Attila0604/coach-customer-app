import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AppHeader from "@/components/nav/AppHeader";
import WeightChart, { type WeightPoint } from "@/components/progress/WeightChart";
import { getDict, resolveLocale, LOCALE_TAG, type Locale } from "@/lib/i18n";

const SESSION_COOKIE = "coach_customer_id";
const TZ = "Europe/Vienna";

function formatDayShort(iso: string, locale: Locale): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE_TAG[locale], {
    day: "2-digit",
    month: "2-digit",
    timeZone: TZ,
  });
}

type Checkin = {
  week_of: string;
  weight_kg: number | null;
  mood_rating: number | null;
  energy_rating: number | null;
  sleep_rating: number | null;
};

export default async function ProgressPage() {
  const customerId = cookies().get(SESSION_COOKIE)?.value;
  if (!customerId) redirect("/");

  const admin = createAdminClient();

  const [{ data: profile }, { data: rawCheckins }] = await Promise.all([
    admin
      .from("customer_profiles")
      .select("weight_start_kg, weight_target_kg, language")
      .eq("customer_id", customerId)
      .maybeSingle(),
    admin
      .from("checkins")
      .select("week_of, weight_kg, mood_rating, energy_rating, sleep_rating")
      .eq("customer_id", customerId)
      .order("week_of", { ascending: true }),
  ]);

  const locale = resolveLocale(profile?.language as string | null | undefined);
  const d = getDict(locale);
  const checkins: Checkin[] = (rawCheckins as Checkin[]) || [];
  const weightCheckins = checkins.filter((c) => c.weight_kg != null);

  // Chart: bis zu 26 jüngste Gewichts-Datenpunkte
  const chartSource = weightCheckins.slice(-26);
  const points: WeightPoint[] = chartSource.map((c) => ({
    label: formatDayShort(c.week_of, locale),
    value: Number(c.weight_kg),
  }));

  const startWeight =
    profile?.weight_start_kg != null
      ? Number(profile.weight_start_kg)
      : weightCheckins.length > 0
      ? Number(weightCheckins[0].weight_kg)
      : null;
  const currentWeight =
    weightCheckins.length > 0
      ? Number(weightCheckins[weightCheckins.length - 1].weight_kg)
      : null;
  const target =
    profile?.weight_target_kg != null ? Number(profile.weight_target_kg) : null;

  const delta =
    startWeight != null && currentWeight != null
      ? Math.round((currentWeight - startWeight) * 10) / 10
      : null;

  const lastCheckin = checkins.length > 0 ? checkins[checkins.length - 1] : null;
  const hasBefinden =
    lastCheckin &&
    (lastCheckin.mood_rating != null ||
      lastCheckin.energy_rating != null ||
      lastCheckin.sleep_rating != null);

  return (
    <>
      <AppHeader title={d.progress.title} />
      <main className="min-h-screen px-6 pt-6 max-w-md mx-auto">

      <section className="mb-10 text-center">
        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          {d.progress.heading}
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed">
          {d.progress.subtitle}
        </p>
      </section>

      {weightCheckins.length === 0 ? (
        <section className="border-t border-white/[0.08] pt-8">
          <p className="text-sm text-bone-faint italic leading-relaxed">
            {d.progress.emptyText}
          </p>
        </section>
      ) : (
        <>
          {/* Kennzahlen */}
          <section className="mb-10 border-t border-white/[0.08] pt-8">
            <div className="grid grid-cols-3 gap-3 mb-8">
              <Stat label={d.progress.start} value={startWeight} unit="kg" locale={locale} />
              <Stat label={d.progress.current} value={currentWeight} unit="kg" accent locale={locale} />
              <Stat label={d.progress.target} value={target} unit="kg" locale={locale} />
            </div>

            {delta != null && (
              <p className="text-sm text-bone-muted">
                {d.progress.changeSince}{" "}
                <span
                  className={
                    delta < 0
                      ? "text-gold font-medium"
                      : delta > 0
                      ? "text-bone font-medium"
                      : "text-bone-muted"
                  }
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toLocaleString(LOCALE_TAG[locale])} kg
                </span>
              </p>
            )}
          </section>

          {/* Chart */}
          {points.length >= 2 ? (
            <section className="mb-10 border-t border-white/[0.08] pt-8">
              <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
                {d.progress.weightTrend}
              </p>
              <WeightChart points={points} target={target} locale={locale} />
            </section>
          ) : (
            <section className="mb-10 border-t border-white/[0.08] pt-8">
              <p className="text-sm text-bone-faint italic">
                {d.progress.needTwo}
              </p>
            </section>
          )}

          {/* Befinden zuletzt */}
          {hasBefinden && (
            <section className="mb-10 border-t border-white/[0.08] pt-8">
              <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
                {d.progress.lastWellbeing}
              </p>
              <div className="space-y-3">
                <RatingRow label={d.checkin.mood} value={lastCheckin!.mood_rating} />
                <RatingRow label={d.checkin.energy} value={lastCheckin!.energy_rating} />
                <RatingRow label={d.checkin.sleep} value={lastCheckin!.sleep_rating} />
              </div>
            </section>
          )}
        </>
      )}

      <footer className="border-t border-white/[0.08] pt-8 mt-4">
        <Link
          href="/me/checkin"
          className="text-[11px] uppercase tracking-caps text-gold hover:text-gold-soft transition-colors font-medium"
        >
          {d.progress.newCheckin}
        </Link>
      </footer>
    </main>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
  locale,
}: {
  label: string;
  value: number | null;
  unit: string;
  accent?: boolean;
  locale: Locale;
}) {
  return (
    <div className="border border-white/[0.08] px-4 py-4 bg-black/20">
      <p className="text-[9px] uppercase tracking-caps text-bone-faint font-medium mb-2">
        {label}
      </p>
      <p
        className={`font-serif text-2xl tabular-nums ${
          accent ? "text-gold" : "text-bone"
        }`}
      >
        {value != null ? value.toLocaleString(LOCALE_TAG[locale]) : "—"}
        {value != null && (
          <span className="text-bone-faint text-sm"> {unit}</span>
        )}
      </p>
    </div>
  );
}

function RatingRow({ label, value }: { label: string; value: number | null }) {
  const pct = value != null ? Math.min(100, (value / 10) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm text-bone-muted">{label}</span>
        <span className="text-sm text-bone font-medium tabular-nums">
          {value != null ? `${value}/10` : "—"}
        </span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
