import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "coach_customer_id";
const TZ = "Europe/Vienna";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  if (sec === 0) return `${min} Min`;
  return `${min} Min ${sec}s`;
}

function formatDayDe(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: TZ,
  });
}

function formatTimeDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function monthKeyDe(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
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

  const { data: raw } = await admin
    .from("workout_sessions")
    .select(
      `
      id,
      status,
      started_at,
      ended_at,
      total_duration_seconds,
      training_days(title, subtitle, day_number),
      workout_logs(reps_done, weight_used_kg)
    `
    )
    .eq("customer_id", customerId)
    .in("status", ["completed", "aborted"])
    .order("started_at", { ascending: false })
    .limit(60);

  const sessions: SessionRow[] = ((raw as any[]) || []).map((s) => ({
    ...s,
    training_days: Array.isArray(s.training_days)
      ? s.training_days[0] ?? null
      : s.training_days,
  }));

  const completedCount = sessions.filter((s) => s.status === "completed").length;

  // Nach Monat gruppieren (Reihenfolge bleibt: neueste zuerst)
  const groups: { label: string; items: SessionRow[] }[] = [];
  for (const s of sessions) {
    const label = monthKeyDe(s.started_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(s);
    else groups.push({ label, items: [s] });
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      <header className="mb-10">
        <Link
          href="/me/training"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-caps text-bone-faint hover:text-bone-muted transition-colors font-medium"
        >
          <span>←</span>
          <span>Trainingsplan</span>
        </Link>
      </header>

      <section className="mb-10">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Verlauf
        </p>
        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          Deine Workouts
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed">
          {sessions.length === 0
            ? "Noch keine abgeschlossenen Workouts."
            : `${completedCount} abgeschlossen${
                sessions.length > completedCount
                  ? ` · ${sessions.length - completedCount} abgebrochen`
                  : ""
              }`}
        </p>
      </section>

      {sessions.length === 0 ? (
        <section className="border-t border-white/[0.08] pt-8">
          <p className="text-sm text-bone-faint italic leading-relaxed">
            Sobald du ein Training startest und abschließt, erscheint es hier. 💪
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
                        {day?.title || "Workout"}
                      </p>
                      <span className="text-[11px] text-bone-faint tabular-nums whitespace-nowrap">
                        {formatDayDe(s.started_at)} · {formatTimeDe(s.started_at)}
                      </span>
                    </div>
                    {day?.subtitle && (
                      <p className="text-[12px] text-bone-muted mb-1.5">
                        {day.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-bone-faint tabular-nums">
                      <span>{formatDuration(s.total_duration_seconds)}</span>
                      <span>· {totalSets} {totalSets === 1 ? "Satz" : "Sätze"}</span>
                      {volume > 0 && <span>· {volume.toLocaleString("de-DE")} kg Vol.</span>}
                      {aborted && (
                        <span className="text-red-400/70 uppercase tracking-caps">
                          · abgebrochen
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

      <footer className="border-t border-white/[0.08] pt-8 mt-4">
        <Link
          href="/me/training"
          className="text-[11px] uppercase tracking-caps text-bone-faint hover:text-bone-muted transition-colors font-medium"
        >
          ← Zurück zum Trainingsplan
        </Link>
      </footer>
    </main>
  );
}
