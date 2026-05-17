import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "coach_customer_id";

// Annahme: weekday 0=Mo ... 6=So (falls 1-7 ISO, einfach diese Konvertierung anpassen)
const WEEKDAY_LABELS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function jsDayToDbWeekday(jsDay: number): number {
  // JS getDay: 0=Su, 1=Mo, ..., 6=Sa
  // DB: 0=Mo, 6=So
  return (jsDay + 6) % 7;
}

function formatTime(time: string | null): string | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length < 2) return null;
  return `${parts[0]}:${parts[1]}`;
}

function formatReps(repsMin: number | null, repsMax: number | null): string {
  if (repsMin == null && repsMax == null) return "";
  if (repsMin === repsMax || repsMax == null) return `${repsMin}`;
  if (repsMin == null) return `${repsMax}`;
  return `${repsMin}-${repsMax}`;
}

function formatRest(rest: number | null): string | null {
  if (!rest) return null;
  if (rest < 60) return `${rest}s`;
  const min = Math.floor(rest / 60);
  const sec = rest % 60;
  if (sec === 0) return `${min} Min`;
  return `${min}:${String(sec).padStart(2, "0")} Min`;
}

type Exercise = {
  id: string;
  day_id: string;
  sort_order: number;
  name: string;
  sets: number | null;
  reps_min: number | null;
  reps_max: number | null;
  weight_kg: number | null;
  weight_type: string | null;
  notes: string | null;
  rest_seconds: number | null;
};

type TrainingDay = {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  subtitle: string | null;
  sort_order: number;
  weekday: number | null;
  time_of_day: string | null;
};

export default async function TrainingPage() {
  const cookieStore = cookies();
  const customerId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!customerId) redirect("/");

  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("training_plans")
    .select("id, name, weeks, current_week, status, start_date")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let days: TrainingDay[] = [];
  const exercisesByDay = new Map<string, Exercise[]>();

  if (plan) {
    const { data: daysData } = await admin
      .from("training_days")
      .select(
        "id, plan_id, day_number, title, subtitle, sort_order, weekday, time_of_day"
      )
      .eq("plan_id", plan.id)
      .order("sort_order", { ascending: true });
    days = daysData || [];

    if (days.length > 0) {
      const { data: exercisesData } = await admin
        .from("exercises")
        .select(
          "id, day_id, sort_order, name, sets, reps_min, reps_max, weight_kg, weight_type, notes, rest_seconds"
        )
        .in("day_id", days.map((d) => d.id))
        .order("sort_order", { ascending: true });

      (exercisesData || []).forEach((ex) => {
        if (!exercisesByDay.has(ex.day_id)) exercisesByDay.set(ex.day_id, []);
        exercisesByDay.get(ex.day_id)!.push(ex);
      });
    }
  }

  const today = new Date();
  const todayDbWeekday = jsDayToDbWeekday(today.getDay());
  const todaysDay = days.find((d) => d.weekday === todayDbWeekday) || null;
  const trainingWeekdays = new Set(
    days.filter((d) => d.weekday != null).map((d) => d.weekday as number)
  );

  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      <Link
        href="/me"
        className="text-[11px] uppercase tracking-caps text-bone-faint hover:text-bone-muted transition-colors mb-8 inline-block"
      >
        ← Member-Bereich
      </Link>

      <header className="mb-12">
        <p className="font-serif text-base text-gold tracking-wide">Coach</p>
      </header>

      <section className="mb-10">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Trainingsplan
        </p>
        {plan ? (
          <>
            <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
              {plan.name}
            </h1>
            {plan.current_week && plan.weeks && (
              <>
                <p className="text-sm text-bone-muted leading-relaxed mb-4">
                  Woche {plan.current_week} von {plan.weeks}
                </p>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all"
                    style={{
                      width: `${Math.min(100, (plan.current_week / plan.weeks) * 100)}%`,
                    }}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
            Kein aktiver Plan
          </h1>
        )}
      </section>

      {!plan ? (
        <section className="border-t border-white/[0.08] pt-8">
          <p className="text-sm text-bone-muted leading-relaxed">
            György erstellt deinen persönlichen Trainingsplan im Coach-Tool.
            Sobald er aktiv ist, siehst du ihn hier. 💪
          </p>
        </section>
      ) : (
        <>
          <section className="mb-10 border-t border-white/[0.08] pt-8">
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
              Diese Woche
            </p>
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAY_LABELS_SHORT.map((label, idx) => {
                const isTraining = trainingWeekdays.has(idx);
                const isToday = idx === todayDbWeekday;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs transition ${
                        isToday
                          ? "bg-gold/15 ring-1 ring-gold"
                          : isTraining
                          ? "bg-gold/10"
                          : "bg-white/[0.04]"
                      }`}
                    >
                      {isTraining ? (
                        <span>💪</span>
                      ) : (
                        <span className="text-bone-faint">·</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider ${
                        isToday
                          ? "text-gold font-medium"
                          : "text-bone-faint"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {todaysDay ? (
            <section className="mb-10 border-t border-white/[0.08] pt-8">
              <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
                Heute&apos;s Training
              </p>
              <div className="space-y-1 mb-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-[10px] uppercase tracking-caps text-gold/70 font-medium">
                    Tag {todaysDay.day_number}
                  </span>
                  {todaysDay.time_of_day && (
                    <span className="text-[10px] uppercase tracking-caps text-bone-faint">
                      {formatTime(todaysDay.time_of_day)}
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-2xl text-bone leading-tight">
                  {todaysDay.title}
                </h2>
                {todaysDay.subtitle && (
                  <p className="text-sm text-bone-muted">
                    {todaysDay.subtitle}
                  </p>
                )}
              </div>

              {(exercisesByDay.get(todaysDay.id) || []).length > 0 ? (
                <ul className="space-y-5">
                  {(exercisesByDay.get(todaysDay.id) || []).map((ex) => (
                    <li
                      key={ex.id}
                      className="border-l-2 border-gold/40 pl-4"
                    >
                      <div className="flex justify-between items-baseline gap-3 mb-1">
                        <p className="text-sm text-bone font-medium">
                          {ex.name}
                        </p>
                        <p className="text-sm text-bone tabular-nums whitespace-nowrap">
                          {ex.sets && (
                            <>
                              {ex.sets} × {formatReps(ex.reps_min, ex.reps_max)}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-[11px] text-bone-faint">
                        {ex.weight_kg != null && (
                          <span>{ex.weight_kg} kg</span>
                        )}
                        {ex.rest_seconds != null && (
                          <span>{formatRest(ex.rest_seconds)} Pause</span>
                        )}
                      </div>
                      {ex.notes && (
                        <p className="text-[11px] text-bone-muted italic mt-1.5">
                          {ex.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-bone-faint italic">
                  Noch keine Übungen für diesen Tag definiert.
                </p>
              )}
            </section>
          ) : (
            <section className="mb-10 border-t border-white/[0.08] pt-8">
              <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
                Heute
              </p>
              <p className="text-sm text-bone-muted italic">
                💤 Heute kein Training — gönn dir Erholung.
              </p>
            </section>
          )}

          <section className="mb-12 border-t border-white/[0.08] pt-8">
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
              Alle Trainingstage
            </p>
            {days.length === 0 ? (
              <p className="text-sm text-bone-faint italic">
                Noch keine Trainingstage definiert.
              </p>
            ) : (
              <ul className="space-y-8">
                {days.map((day) => {
                  const isToday = day.weekday === todayDbWeekday;
                  const dayExercises = exercisesByDay.get(day.id) || [];
                  return (
                    <li key={day.id}>
                      <div className="mb-3">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                          <span className="text-[10px] uppercase tracking-caps text-gold/70 font-medium">
                            Tag {day.day_number}
                          </span>
                          {day.weekday != null &&
                            day.weekday >= 0 &&
                            day.weekday <= 6 && (
                              <span className="text-[10px] uppercase tracking-caps text-bone-faint">
                                {WEEKDAY_LABELS_SHORT[day.weekday]}
                                {day.time_of_day && (
                                  <> · {formatTime(day.time_of_day)}</>
                                )}
                              </span>
                            )}
                          {isToday && (
                            <span className="text-[10px] uppercase tracking-caps text-gold font-medium">
                              · Heute
                            </span>
                          )}
                        </div>
                        <h3 className="font-serif text-xl text-bone leading-tight">
                          {day.title}
                        </h3>
                        {day.subtitle && (
                          <p className="text-sm text-bone-muted mt-1">
                            {day.subtitle}
                          </p>
                        )}
                      </div>
                      {dayExercises.length > 0 ? (
                        <ul className="space-y-2.5 mt-3">
                          {dayExercises.map((ex) => (
                            <li
                              key={ex.id}
                              className="flex justify-between items-baseline gap-3"
                            >
                              <span className="text-sm text-bone min-w-0 truncate">
                                {ex.name}
                              </span>
                              <span className="text-sm text-bone-muted tabular-nums whitespace-nowrap flex-shrink-0">
                                {ex.sets && (
                                  <>
                                    {ex.sets} ×{" "}
                                    {formatReps(ex.reps_min, ex.reps_max)}
                                  </>
                                )}
                                {ex.weight_kg != null && (
                                  <span className="text-bone-faint">
                                    {" · "}
                                    {ex.weight_kg}kg
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-bone-faint italic mt-2">
                          Keine Übungen.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <footer className="border-t border-white/[0.08] pt-8 mt-4">
        <Link
          href="/me"
          className="text-[11px] uppercase tracking-caps text-bone-faint hover:text-bone-muted transition-colors font-medium"
        >
          ← Zurück zum Member-Bereich
        </Link>
      </footer>
    </main>
  );
}
