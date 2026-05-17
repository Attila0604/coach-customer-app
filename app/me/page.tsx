import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "coach_customer_id";

const DEFAULT_KCAL_GOAL = 2000;
const DEFAULT_PROTEIN_G = 150;
const DEFAULT_CARBS_G = 200;
const DEFAULT_FAT_G = 65;

const MEAL_TYPE_DE: Record<string, string> = {
  breakfast: "Frühstück",
  frühstück: "Frühstück",
  fruehstueck: "Frühstück",
  lunch: "Mittagessen",
  mittag: "Mittag",
  mittagessen: "Mittagessen",
  dinner: "Abendessen",
  abend: "Abend",
  abendessen: "Abendessen",
  snack: "Snack",
};

const FALLBACK_TIPPS = [
  "Trink heute deine 2 L Wasser — schon vor dem Frühstück.",
  "Eiweiß zu jeder Mahlzeit — dein Körper dankt's dir.",
  "10 Minuten Bewegung sind besser als 0. Auch heute.",
  "Smartphone weg beim Essen. Spür wie's schmeckt.",
  "Schlaf ist genauso wichtig wie Training. Heute vor 23 Uhr ins Bett?",
  "Konsistenz schlägt Perfektion. Einfach weiter loggen.",
  "Lob dich heute. Dranbleiben ist die halbe Miete.",
  "Plan deine Mahlzeiten — morgen schon vorbereiten.",
];

function greetingDe(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 17) return "Hallo";
  if (hour >= 17 && hour < 22) return "Guten Abend";
  return "Servus";
}

function motivationalSubtitleDe(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "Bereit für einen starken Tag?";
  if (hour >= 11 && hour < 14) return "Halbzeit — bleib dran.";
  if (hour >= 14 && hour < 18) return "Du machst das gut. Weiter so.";
  if (hour >= 18 && hour < 22) return "Schöner Abend.";
  return "Ruhe dich gut aus.";
}

function timeAgoDe(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateDe(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatMealLabel(
  meal_type: string | null,
  raw_description: string | null
): string {
  const desc = raw_description || "Mahlzeit";
  if (!meal_type) return desc;
  const typeKey = meal_type.toLowerCase();
  const typeDe =
    MEAL_TYPE_DE[typeKey] ||
    meal_type.charAt(0).toUpperCase() + meal_type.slice(1).toLowerCase();
  return `${typeDe}: ${desc}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function calculateStreak(loggedDates: Set<string>): number {
  if (loggedDates.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(today);
  if (!loggedDates.has(dateKey(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  let streak = 0;
  while (loggedDates.has(dateKey(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

type WeekDay = {
  label: string;
  kcal: number;
  percent: number;
  isToday: boolean;
  isFuture: boolean;
};

function buildWeekData(
  today: Date,
  dailyKcals: Map<string, number>,
  kcalGoal: number
): WeekDay[] {
  const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const weekStart = startOfWeekMonday(today);
  const todayKey = dateKey(today);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(23, 59, 59, 999);
  const result: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = dateKey(d);
    const kcal = dailyKcals.get(key) || 0;
    const isToday = key === todayKey;
    const isFuture = d > todayMidnight;
    const percent = isFuture ? 0 : Math.min(100, (kcal / kcalGoal) * 100);
    result.push({ label: labels[i], kcal, percent, isToday, isFuture });
  }
  return result;
}

function pickFallbackTip(date: Date): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return FALLBACK_TIPPS[dayOfYear % FALLBACK_TIPPS.length];
}

type MacroRow = {
  label: string;
  value: number;
  target: number;
  unit: string;
};

export default async function MePage() {
  const cookieStore = cookies();
  const customerId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!customerId) redirect("/");

  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("first_name, telegram_username, coach_id")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) redirect("/");

  const firstName = customer.first_name || "Member";
  const telegramUsername = customer.telegram_username || "";
  const coachId = customer.coach_id;

  const { data: profile } = await admin
    .from("customer_profiles")
    .select(
      "daily_kcal_target, protein_target_g, carbs_target_g, fat_target_g, weight_target_kg"
    )
    .eq("customer_id", customerId)
    .maybeSingle();

  const kcalGoal = profile?.daily_kcal_target || DEFAULT_KCAL_GOAL;
  const proteinGoal = profile?.protein_target_g || DEFAULT_PROTEIN_G;
  const carbsGoal = profile?.carbs_target_g || DEFAULT_CARBS_G;
  const fatGoal = profile?.fat_target_g || DEFAULT_FAT_G;
  const weightTarget = profile?.weight_target_kg || null;

  const now = new Date();
  const nowIso = now.toISOString();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  let coachNote: string | null = null;

  const { data: personalNote } = await admin
    .from("coach_notes")
    .select("content")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (personalNote?.content) {
    coachNote = personalNote.content;
  } else if (coachId) {
    const { data: globalNote } = await admin
      .from("coach_notes")
      .select("content")
      .eq("coach_id", coachId)
      .is("customer_id", null)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (globalNote?.content) coachNote = globalNote.content;
  }

  const dailyTip = coachNote || pickFallbackTip(now);
  const isRealNote = !!coachNote;

  const { data: lastCheckin } = await admin
    .from("checkins")
    .select("created_at, weight_kg, mood_rating")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: todayLogs } = await admin
    .from("food_logs")
    .select("total_kcal, protein_g, carbs_g, fat_g")
    .eq("customer_id", customerId)
    .gte("logged_at", startOfDay.toISOString());

  const todayTotals = (todayLogs || []).reduce(
    (acc, log) => ({
      kcal: acc.kcal + (Number(log.total_kcal) || 0),
      protein: acc.protein + (Number(log.protein_g) || 0),
      carbs: acc.carbs + (Number(log.carbs_g) || 0),
      fat: acc.fat + (Number(log.fat_g) || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const { data: lookbackLogs } = await admin
    .from("food_logs")
    .select("logged_at, total_kcal")
    .eq("customer_id", customerId)
    .gte("logged_at", sixtyDaysAgo.toISOString());

  const loggedDates = new Set<string>();
  const dailyKcals = new Map<string, number>();
  (lookbackLogs || []).forEach((log) => {
    const key = dateKey(new Date(log.logged_at));
    loggedDates.add(key);
    dailyKcals.set(
      key,
      (dailyKcals.get(key) || 0) + (Number(log.total_kcal) || 0)
    );
  });

  const streak = calculateStreak(loggedDates);
  const weekData = buildWeekData(now, dailyKcals, kcalGoal);

  const { data: recentLogs } = await admin
    .from("food_logs")
    .select("id, meal_type, raw_description, total_kcal, logged_at")
    .eq("customer_id", customerId)
    .order("logged_at", { ascending: false })
    .limit(5);

  const logs = recentLogs || [];

  const macros: MacroRow[] = [
    { label: "Kalorien", value: todayTotals.kcal, target: kcalGoal, unit: "kcal" },
    { label: "Protein", value: todayTotals.protein, target: proteinGoal, unit: "g" },
    { label: "Carbs", value: todayTotals.carbs, target: carbsGoal, unit: "g" },
    { label: "Fat", value: todayTotals.fat, target: fatGoal, unit: "g" },
  ];

  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      <header className="mb-12">
        <p className="font-serif text-base text-gold tracking-wide">Coach</p>
      </header>

      <section className="mb-10">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Eingeloggt
        </p>
        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          {greetingDe(now)}, {firstName}.
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed mb-3">
          {formatDateDe(now)}
          {streak > 0 && (
            <>
              <span className="mx-2 text-bone-faint">·</span>
              <span className="text-gold">
                🔥 {streak} {streak === 1 ? "Tag" : "Tage"} Streak
              </span>
            </>
          )}
        </p>
        <p className="text-sm text-bone-faint italic leading-relaxed">
          {motivationalSubtitleDe(now)}
        </p>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
          Diese Woche
        </p>
        <div className="flex items-end justify-between gap-2 h-20">
          {weekData.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-sm transition-all ${
                    day.isFuture
                      ? "bg-white/[0.04]"
                      : day.percent > 0
                      ? day.isToday
                        ? "bg-gold"
                        : "bg-gold/60"
                      : "bg-white/[0.06]"
                  }`}
                  style={{ height: `${Math.max(4, day.percent)}%` }}
                />
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  day.isToday ? "text-gold font-medium" : "text-bone-faint"
                }`}
              >
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
          Heute
        </p>
        <div className="space-y-5">
          <div className="flex justify-between items-baseline gap-3">
            <span className="text-sm text-bone-muted flex-shrink-0">
              Letzter Check-in
            </span>
            <span className="text-sm text-bone font-medium text-right">
              {lastCheckin ? (
                <>
                  {timeAgoDe(lastCheckin.created_at)}
                  {lastCheckin.weight_kg && (
                    <span className="text-bone-muted">
                      {" · "}
                      {lastCheckin.weight_kg} kg
                      {weightTarget && (
                        <span className="text-bone-faint">
                          {" → "}
                          {weightTarget} kg
                        </span>
                      )}
                    </span>
                  )}
                  {lastCheckin.mood_rating != null && (
                    <span className="text-bone-muted">
                      {" · "}
                      {lastCheckin.mood_rating}/10
                    </span>
                  )}
                </>
              ) : (
                "—"
              )}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {macros.map((m) => {
              const pct = Math.min(100, (m.value / m.target) * 100);
              return (
                <div key={m.label}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm text-bone-muted">{m.label}</span>
                    <span className="text-sm text-bone font-medium tabular-nums">
                      {Math.round(m.value).toLocaleString("de-DE")}
                      <span className="text-bone-faint">
                        {" / "}
                        {m.target.toLocaleString("de-DE")} {m.unit}
                      </span>
                    </span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <Link href="/me/training" className="block group">
          <div className="flex justify-between items-baseline">
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium">
              Trainingsplan
            </p>
            <span className="text-gold text-sm group-hover:translate-x-1 transition-transform inline-block">
              →
            </span>
          </div>
          <p className="text-sm text-bone-muted mt-2">
            Übersicht & heutiges Workout
          </p>
        </Link>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-4">
          {isRealNote ? "Nachricht vom Coach" : "Coach's Tipp"}
        </p>
        <blockquote className="border-l-2 border-gold/40 pl-4">
          <p className="font-serif text-base text-bone italic leading-relaxed mb-2">
            &ldquo;{dailyTip}&rdquo;
          </p>
          <p className="text-[11px] uppercase tracking-caps text-bone-faint">
            — György
          </p>
        </blockquote>
      </section>

      <section className="mb-12 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
          Aktivität
        </p>
        {logs.length > 0 ? (
          <ul className="space-y-4">
            {logs.map((log, idx) => (
              <li
                key={log.id ?? idx}
                className="flex justify-between items-baseline gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-bone truncate">
                    {formatMealLabel(log.meal_type, log.raw_description)}
                  </p>
                  <p className="text-[11px] text-bone-faint mt-0.5">
                    {timeAgoDe(log.logged_at)}
                  </p>
                </div>
                {log.total_kcal != null && (
                  <span className="text-sm text-bone-muted flex-shrink-0 tabular-nums">
                    {log.total_kcal} kcal
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-bone-faint italic">
            Noch keine Einträge. Logge im Telegram-Bot.
          </p>
        )}
      </section>

      <footer className="border-t border-white/[0.08] pt-8">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-[11px] uppercase tracking-caps text-bone-faint hover:text-bone-muted transition-colors font-medium"
          >
            Abmelden
          </button>
        </form>
        <p className="text-[11px] text-bone-faint mt-5">
          Eingeloggt als @{telegramUsername}
        </p>
      </footer>
    </main>
  );
}
