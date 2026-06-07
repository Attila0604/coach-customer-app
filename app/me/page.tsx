import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  viennaDateKey as dateKey,
  viennaStartOfDayUtc,
  viennaNoonAnchor,
  viennaDow,
} from "@/lib/date";
import { mealTypeLabel } from "@/lib/meals";
import { getDict, resolveLocale, type Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

const SESSION_COOKIE = "coach_customer_id";

const DEFAULT_KCAL_GOAL = 2000;
const DEFAULT_PROTEIN_G = 150;
const DEFAULT_CARBS_G = 200;
const DEFAULT_FAT_G = 65;

const LOCALE_TAG: Record<Locale, string> = {
  de: "de-DE",
  it: "it-IT",
  hu: "hu-HU",
};

function greeting(date: Date, locale: Locale): string {
  const g = getDict(locale).home.greeting;
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return g.morning;
  if (hour >= 11 && hour < 17) return g.day;
  if (hour >= 17 && hour < 22) return g.evening;
  return g.night;
}

function motivationalSubtitle(date: Date, locale: Locale): string {
  const sub = getDict(locale).home.subtitle;
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return sub.morning;
  if (hour >= 11 && hour < 14) return sub.midday;
  if (hour >= 14 && hour < 18) return sub.afternoon;
  if (hour >= 18 && hour < 22) return sub.evening;
  return sub.night;
}

function timeAgo(iso: string, locale: Locale): string {
  const t = getDict(locale).home.timeAgo;
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t.now;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t.min.replace("{n}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.hour.replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days === 1) return t.yesterday;
  if (days < 7) return t.days.replace("{n}", String(days));
  return date.toLocaleDateString(LOCALE_TAG[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(LOCALE_TAG[locale], {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatMealLabel(
  meal_type: string | null,
  raw_description: string | null,
  locale: Locale
): string {
  const desc = raw_description || getDict(locale).home.mealDefault;
  if (!meal_type) return desc;
  return `${mealTypeLabel(meal_type, locale)}: ${desc}`;
}

function startOfWeekMonday(date: Date): Date {
  const anchor = viennaNoonAnchor(date);
  const dow = viennaDow(anchor);
  const diff = dow === 0 ? -6 : 1 - dow;
  anchor.setUTCDate(anchor.getUTCDate() + diff);
  return anchor;
}

function calculateStreak(loggedDates: Set<string>): number {
  if (loggedDates.size === 0) return 0;
  const checkDate = viennaNoonAnchor(new Date());
  if (!loggedDates.has(dateKey(checkDate))) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }
  let streak = 0;
  while (loggedDates.has(dateKey(checkDate))) {
    streak++;
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
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
  kcalGoal: number,
  weekdays: string[]
): WeekDay[] {
  const labels = weekdays;
  const weekStart = startOfWeekMonday(today);
  const todayKey = dateKey(today);
  const result: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const key = dateKey(d);
    const kcal = dailyKcals.get(key) || 0;
    const isToday = key === todayKey;
    const isFuture = key > todayKey; // "YYYY-MM-DD"-Strings vergleichen sich chronologisch
    const percent = isFuture ? 0 : Math.min(100, (kcal / kcalGoal) * 100);
    result.push({ label: labels[i], kcal, percent, isToday, isFuture });
  }
  return result;
}

function pickFallbackTip(date: Date, locale: Locale): string {
  const tips = getDict(locale).home.tips;
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return tips[dayOfYear % tips.length];
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
      "daily_kcal_target, protein_target_g, carbs_target_g, fat_target_g, weight_target_kg, language"
    )
    .eq("customer_id", customerId)
    .maybeSingle();

  const kcalGoal = profile?.daily_kcal_target || DEFAULT_KCAL_GOAL;
  const proteinGoal = profile?.protein_target_g || DEFAULT_PROTEIN_G;
  const carbsGoal = profile?.carbs_target_g || DEFAULT_CARBS_G;
  const fatGoal = profile?.fat_target_g || DEFAULT_FAT_G;
  const weightTarget = profile?.weight_target_kg || null;
  const locale = resolveLocale(profile?.language as string | null | undefined);
  const d = getDict(locale);

  const now = new Date();
  const nowIso = now.toISOString();
  const todayIsoStr = dateKey(now);
  const startOfDay = viennaStartOfDayUtc(now);
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

  const dailyTip = coachNote || pickFallbackTip(now, locale);
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
  const weekData = buildWeekData(now, dailyKcals, kcalGoal, d.home.weekdays);

  const { data: recentLogs } = await admin
    .from("food_logs")
    .select("id, meal_type, raw_description, total_kcal, logged_at")
    .eq("customer_id", customerId)
    .order("logged_at", { ascending: false })
    .limit(5);

  const logs = recentLogs || [];

  // Today's published meal plan (Coach has approved it)
  const { data: todayPlanRaw } = await admin
    .from("meal_plans")
    .select("id, meals, total_kcal")
    .eq("customer_id", customerId)
    .eq("status", "published")
    .eq("plan_date", todayIsoStr)
    .maybeSingle();

  const todayPlan = todayPlanRaw
    ? {
        meals: Array.isArray(todayPlanRaw.meals) ? todayPlanRaw.meals : [],
        kcal: Number(todayPlanRaw.total_kcal) || 0,
      }
    : null;

  // If no plan for today, check if any future published plan exists (for hint)
  let hasUpcomingPlan = false;
  if (!todayPlan) {
    const { data: anyFuture } = await admin
      .from("meal_plans")
      .select("id")
      .eq("customer_id", customerId)
      .eq("status", "published")
      .gt("plan_date", todayIsoStr)
      .limit(1)
      .maybeSingle();
    hasUpcomingPlan = !!anyFuture;
  }

  const macros: MacroRow[] = [
    { label: d.home.macros.calories, value: todayTotals.kcal, target: kcalGoal, unit: "kcal" },
    { label: d.home.macros.protein, value: todayTotals.protein, target: proteinGoal, unit: "g" },
    { label: d.home.macros.carbs, value: todayTotals.carbs, target: carbsGoal, unit: "g" },
    { label: d.home.macros.fat, value: todayTotals.fat, target: fatGoal, unit: "g" },
  ];

  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      <header className="mb-8 flex flex-col items-center gap-4">
        <img src="/logo.webp" alt="Rákosi Gym" className="w-20 h-20" />
        <LanguageSwitcher current={locale} />
      </header>

      <section className="mb-10 animate-fade-in-up text-center">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          {d.home.loggedIn}
        </p>
        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          {greeting(now, locale)}, {firstName}.
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed mb-3">
          {formatDate(now, locale)}
          {streak > 0 && (
            <>
              <span className="mx-2 text-bone-faint">·</span>
              <span className="text-gold">
                <span className="animate-flame">🔥</span> {streak}{" "}
                {streak === 1 ? d.home.dayOne : d.home.dayMany}{" "}{d.home.streakWord}
              </span>
            </>
          )}
        </p>
        <p className="text-sm text-bone-faint italic leading-relaxed">
          {motivationalSubtitle(now, locale)}
        </p>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
          {d.home.thisWeek}
        </p>
        <div className="flex items-end justify-between gap-2 h-20">
          {weekData.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-sm transition-all animate-bar ${
                    day.isFuture
                      ? "bg-white/[0.04]"
                      : day.percent > 0
                      ? day.isToday
                        ? "bg-gold"
                        : "bg-gold/60"
                      : "bg-white/[0.06]"
                  }`}
                  style={{
                    height: `${Math.max(4, day.percent)}%`,
                    animationDelay: `${idx * 60}ms`,
                  }}
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
          {d.home.today}
        </p>
        <div className="space-y-5">
          <div className="flex justify-between items-baseline gap-3">
            <span className="text-sm text-bone-muted flex-shrink-0">
              {d.home.lastCheckin}
            </span>
            <span className="text-sm text-bone font-medium text-right">
              {lastCheckin ? (
                <>
                  {timeAgo(lastCheckin.created_at, locale)}
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
                      {Math.round(m.value).toLocaleString(LOCALE_TAG[locale])}
                      <span className="text-bone-faint">
                        {" / "}
                        {m.target.toLocaleString(LOCALE_TAG[locale])} {m.unit}
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

      {/* NEW: Nutrition plan preview */}
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <Link href="/me/nutrition" className="block group">
          <div className="flex justify-between items-baseline">
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium">
              {d.home.nutritionPlan}
            </p>
            <span className="text-gold text-sm group-hover:translate-x-1 transition-transform inline-block">
              →
            </span>
          </div>
          <p className="text-sm text-bone-muted mt-2">
            {todayPlan
              ? `${todayPlan.meals.length} ${
                  todayPlan.meals.length === 1 ? d.home.mealOne : d.home.mealMany
                } ${d.home.todayLower} · ${Math.round(todayPlan.kcal).toLocaleString(
                  LOCALE_TAG[locale]
                )} kcal`
              : hasUpcomingPlan
              ? d.home.planUpcoming
              : d.home.planNone}
          </p>
        </Link>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <Link href="/me/training" className="block group">
          <div className="flex justify-between items-baseline">
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium">
              {d.home.trainingPlan}
            </p>
            <span className="text-gold text-sm group-hover:translate-x-1 transition-transform inline-block">
              →
            </span>
          </div>
          <p className="text-sm text-bone-muted mt-2">
            {d.home.trainingSub}
          </p>
        </Link>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <Link href="/me/checkin" className="block group">
          <div className="flex justify-between items-baseline">
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium">
              {d.home.checkin}
            </p>
            <span className="text-gold text-sm group-hover:translate-x-1 transition-transform inline-block">
              →
            </span>
          </div>
          <p className="text-sm text-bone-muted mt-2">
            {lastCheckin
              ? `${d.home.checkinLastPrefix} ${timeAgo(lastCheckin.created_at, locale)} · ${d.home.checkinUpdate}`
              : d.home.checkinEmpty}
          </p>
        </Link>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <Link href="/me/progress" className="block group">
          <div className="flex justify-between items-baseline">
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium">
              {d.home.progress}
            </p>
            <span className="text-gold text-sm group-hover:translate-x-1 transition-transform inline-block">
              →
            </span>
          </div>
          <p className="text-sm text-bone-muted mt-2">
            {d.home.progressSub}
          </p>
        </Link>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-4">
          {isRealNote ? d.home.coachMessage : d.home.coachTip}
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
          {d.home.activity}
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
                    {formatMealLabel(log.meal_type, log.raw_description, locale)}
                  </p>
                  <p className="text-[11px] text-bone-faint mt-0.5">
                    {timeAgo(log.logged_at, locale)}
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
            {d.home.activityEmpty}
          </p>
        )}
      </section>

      <footer className="border-t border-white/[0.08] pt-8">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-[11px] uppercase tracking-caps text-bone-faint hover:text-bone-muted transition-colors font-medium"
          >
            {d.home.logout}
          </button>
        </form>
        <p className="text-[11px] text-bone-faint mt-5">
          {d.home.loggedInAs} @{telegramUsername}
        </p>
      </footer>
    </main>
  );
}
