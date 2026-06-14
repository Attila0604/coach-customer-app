import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AppHeader from "@/components/nav/AppHeader";
import { getDict, LOCALE_TAG, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

const SESSION_COOKIE = "coach_customer_id";
const TZ = "Europe/Vienna";

function formatDuration(seconds: number | null, minUnit: string): string {
  if (!seconds || seconds <= 0) return "—";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  if (sec === 0) return `${min} ${minUnit}`;
  return `${min} ${minUnit} ${sec}s`;
}

function formatDay(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(LOCALE_TAG[locale], {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: TZ,
  });
}

function formatTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(LOCALE_TAG[locale], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function monthKey(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(LOCALE_TAG[locale], {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}

type SessionRow = {
  id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  total_duration_seconds: number | null;
  training_days: { title: string | null; subtitle: string | null; day_number: number | null } | null;
  workout_logs: { reps_done: number | null; weight_used_kg: number | null }[] | null;
};

export default async function WorkoutHistoryPage() {
  const customerId = cookies().get(SESSION_COOKIE)?.value;
  if (!customerId) redirect("/");

  const admin = createAdminClient();
  const locale = await getLocale();
  const d = getDict(locale);

  const { data: raw } = await admin
    .from("workout_sessions")
    .select(
      `
      id,
      status,
      started_at,
      ended_at,
      total_duration_seconds,
      training_days(id, title, subtitle, day_number, training_plans(translations)),
      workout_logs(reps_done, weight_used_kg)
    `
    )
    .eq("customer_id", customerId)
    .in("status", ["completed", "aborted"])
    .order("started_at", { ascending: false })
    .limit(60);

  const sessions: SessionRow[] = ((raw as any[]) || []).map((s) => {
    const day: any = Array.isArray(s.training_days)
      ? s.training_days[0] ?? null
      : s.training_days;

    // Übersetzung des Kunden überlagern (Fallback: Deutsch).
    if (day && locale !== "de") {
      const tr: any = day.training_plans?.translations?.[locale];
      const dtr = tr?.days?.[day.id];
      if (dtr) {
        day.title = dtr.title ?? day.title;
        day.subtitle = dtr.subtitle ?? day.subtitle;
      }
    }

    return { ...s, training_days: day };
  });

  const completedCount = sessions.filter((s) => s.status === "completed").length;

  // Nach Monat gruppieren (Reihenfolge bleibt: neueste zuerst)
  const groups: { label: string; items: SessionRow[] }[] = [];
  for (const s of sessions) {
    const label = monthKey(s.started_at, locale);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(s);
    else groups.push({ label, items: [s] });
  }

  return (
    <>
      <AppHeader title={d.training.history} eyebrow={d.training.title} />
      <main className="min-h-screen px-6 pt-6 max-w-md mx-auto">

      <section className="mb-10 text-center">
        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          {d.history.heading}
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed">
          {sessions.length === 0
            ? d.history.none
            : `${d.history.completed.replace("{n}", String(completedCount))}${
                sessions.length > completedCount
                  ? ` ${d.history.aborted.replace(
                      "{n}",
                      String(sessions.length - completedCount)
                    )}`
                  : ""
              }`}
        </p>
      </section>

      {sessions.length === 0 ? (
        <section className="border-t border-white/[0.08] pt-8">
          <p className="text-sm text-bone-faint italic leading-relaxed">
            {d.history.emptyBody}
          </p>
        </section>
      ) : (
        groups.map((group) => (
          <section
            key={group.label}
            className="mb-8 border-t border-white/[0.08] pt-8"
          >
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
              {group.label}
            </p>
            <ul className="space-y-6">
              {group.items.map((s) => {
                const logs = s.workout_logs || [];
                const totalSets = logs.length;
                const volume = Math.round(
                  logs.reduce(
                    (sum, l) =>
                      sum +
                      (Number(l.weight_used_kg) || 0) * (Number(l.reps_done) || 0),
                    0
                  )
                );
                const day = s.training_days;
                const aborted = s.status === "aborted";
                return (
                  <li key={s.id} className="border-l-2 border-gold/40 pl-4">
                    <div className="flex justify-between items-baseline gap-3 mb-1">
                      <p className="text-sm text-bone font-medium">
                        {day?.title || d.history.workoutFallback}
                      </p>
                      <span className="text-[11px] text-bone-faint tabular-nums whitespace-nowrap">
                        {formatDay(s.started_at, locale)} · {formatTime(s.started_at, locale)}
                      </span>
                    </div>
                    {day?.subtitle && (
                      <p className="text-[12px] text-bone-muted mb-1.5">
                        {day.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-bone-faint tabular-nums">
                      <span>{formatDuration(s.total_duration_seconds, d.training.minUnit)}</span>
                      <span>· {totalSets} {totalSets === 1 ? d.history.setOne : d.history.setMany}</span>
                      {volume > 0 && <span>· {volume.toLocaleString(LOCALE_TAG[locale])} kg Vol.</span>}
                      {aborted && (
                        <span className="text-red-400/70 uppercase tracking-caps">
                          · {d.history.abortedBadge}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

    </main>
    </>
  );
}
