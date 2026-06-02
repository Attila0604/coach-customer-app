import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AppHeader from "@/components/nav/AppHeader";
import { viennaDateKey } from "@/lib/date";
import { mealTypeLabelDe, mealTypeEmoji, mealTypeOrder } from "@/lib/meals";

const SESSION_COOKIE = "coach_customer_id";

const WEEKDAY_SHORT_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEKDAY_LONG_DE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

type MealItem = {
  food: string;
  grams?: number;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

type Meal = {
  meal_type: string;
  name: string;
  items: MealItem[];
  total_kcal?: number;
  total_protein_g?: number;
  total_carbs_g?: number;
  total_fat_g?: number;
  notes?: string;
};

type PublishedPlan = {
  id: string;
  plan_date: string;
  meals: Meal[];
  total_kcal: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
};

function todayIso(): string {
  return viennaDateKey(new Date());
}

function plusDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdayShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return WEEKDAY_SHORT_DE[d.getDay()];
}

function weekdayLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return WEEKDAY_LONG_DE[d.getDay()];
}

function formatDayShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateDe(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function sortMeals(meals: Meal[]): Meal[] {
  return [...meals].sort(
    (a, b) => mealTypeOrder(a.meal_type) - mealTypeOrder(b.meal_type)
  );
}

function dayTotal(plan: PublishedPlan): number {
  if (plan.total_kcal != null) return Math.round(Number(plan.total_kcal));
  let kcal = 0;
  for (const m of plan.meals || []) {
    for (const it of m.items || []) {
      kcal += Number(it.kcal) || 0;
    }
  }
  return Math.round(kcal);
}

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: { d?: string };
}) {
  const cookieStore = cookies();
  const customerId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!customerId) redirect("/");

  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("first_name")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) redirect("/");

  const { data: profile } = await admin
    .from("customer_profiles")
    .select(
      "daily_kcal_target, protein_target_g, carbs_target_g, fat_target_g"
    )
    .eq("customer_id", customerId)
    .maybeSingle();

  const kcalGoal = profile?.daily_kcal_target ?? null;
  const proteinGoal = profile?.protein_target_g ?? null;
  const carbsGoal = profile?.carbs_target_g ?? null;
  const fatGoal = profile?.fat_target_g ?? null;

  const today = todayIso();
  const sevenDaysLater = plusDaysIso(today, 13);

  // Fetch published plans for today through next 14 days
  const { data: rawPlans } = await admin
    .from("meal_plans")
    .select(
      "id, plan_date, meals, total_kcal, total_protein_g, total_carbs_g, total_fat_g"
    )
    .eq("customer_id", customerId)
    .eq("status", "published")
    .gte("plan_date", today)
    .lte("plan_date", sevenDaysLater)
    .order("plan_date", { ascending: true });

  const plans: PublishedPlan[] = (rawPlans ?? []).map((p: any) => ({
    id: p.id,
    plan_date: p.plan_date,
    meals: Array.isArray(p.meals) ? p.meals : [],
    total_kcal: p.total_kcal,
    total_protein_g: p.total_protein_g,
    total_carbs_g: p.total_carbs_g,
    total_fat_g: p.total_fat_g,
  }));

  // Determine active plan: from searchParams ?d=YYYY-MM-DD, else today, else first available
  let activeDate: string | null = null;
  if (searchParams.d && plans.some((p) => p.plan_date === searchParams.d)) {
    activeDate = searchParams.d;
  } else if (plans.some((p) => p.plan_date === today)) {
    activeDate = today;
  } else if (plans.length > 0) {
    activeDate = plans[0].plan_date;
  }

  const activePlan = activeDate
    ? plans.find((p) => p.plan_date === activeDate) ?? null
    : null;

  return (
    <>
      <AppHeader title="Ernährung" />
      <main className="min-h-screen px-6 pt-6 max-w-md mx-auto">

      <section className="mb-10">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Ernährungsplan
        </p>
        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          Deine Woche
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed">
          Von deinem Coach erstellt.
        </p>
      </section>

      {plans.length === 0 ? (
        <section className="mb-10 border-t border-white/[0.08] pt-8">
          <p className="text-sm text-bone-faint italic">
            Noch kein Plan veröffentlicht. Dein Coach arbeitet daran — bald
            verfügbar.
          </p>
        </section>
      ) : (
        <>
          {/* Day strip */}
          <section className="mb-10 border-t border-white/[0.08] pt-8">
            <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
              Tage
            </p>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
              {plans.map((p) => {
                const isActive = p.plan_date === activeDate;
                const isToday = p.plan_date === today;
                return (
                  <Link
                    key={p.id}
                    href={`/me/nutrition?d=${p.plan_date}`}
                    className={`flex-shrink-0 min-w-[52px] text-center py-2.5 px-2 border-b-2 transition ${
                      isActive
                        ? "border-gold"
                        : "border-white/[0.06] hover:border-white/20"
                    }`}
                  >
                    <p
                      className={`text-[10px] uppercase tracking-caps font-medium ${
                        isActive
                          ? "text-gold"
                          : isToday
                          ? "text-bone"
                          : "text-bone-muted"
                      }`}
                    >
                      {weekdayShort(p.plan_date)}
                    </p>
                    <p
                      className={`text-[10px] tabular-nums mt-0.5 ${
                        isActive ? "text-bone" : "text-bone-faint"
                      }`}
                    >
                      {formatDayShort(p.plan_date)}
                    </p>
                    <p
                      className={`text-[10px] tabular-nums mt-1 ${
                        isActive ? "text-bone-muted" : "text-bone-faint"
                      }`}
                    >
                      {dayTotal(p)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Active day detail */}
          {activePlan && (
            <DayDetail
              plan={activePlan}
              isToday={activePlan.plan_date === today}
              kcalGoal={kcalGoal}
              proteinGoal={proteinGoal}
              carbsGoal={carbsGoal}
              fatGoal={fatGoal}
            />
          )}
        </>
      )}

    </main>
    </>
  );
}

/* ============== sub-components (server) ============== */

function DayDetail({
  plan,
  isToday,
  kcalGoal,
  proteinGoal,
  carbsGoal,
  fatGoal,
}: {
  plan: PublishedPlan;
  isToday: boolean;
  kcalGoal: number | null;
  proteinGoal: number | null;
  carbsGoal: number | null;
  fatGoal: number | null;
}) {
  const meals = sortMeals(plan.meals || []);

  const totals = {
    kcal: Number(plan.total_kcal) || 0,
    protein: Number(plan.total_protein_g) || 0,
    carbs: Number(plan.total_carbs_g) || 0,
    fat: Number(plan.total_fat_g) || 0,
  };

  return (
    <>
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          {isToday ? "Heute" : weekdayLong(plan.plan_date)}
        </p>
        <h2 className="font-serif text-2xl text-bone leading-tight mb-5 font-normal">
          {formatDateDe(plan.plan_date)}
        </h2>

        <div className="space-y-3">
          <MacroBar
            label="Kalorien"
            value={totals.kcal}
            target={kcalGoal}
            unit="kcal"
          />
          <MacroBar
            label="Protein"
            value={totals.protein}
            target={proteinGoal}
            unit="g"
          />
          <MacroBar
            label="Carbs"
            value={totals.carbs}
            target={carbsGoal}
            unit="g"
          />
          <MacroBar
            label="Fett"
            value={totals.fat}
            target={fatGoal}
            unit="g"
          />
        </div>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
          Mahlzeiten · {meals.length}
        </p>
        {meals.length === 0 ? (
          <p className="text-sm text-bone-faint italic">
            Keine Mahlzeiten für diesen Tag.
          </p>
        ) : (
          <div className="space-y-6">
            {meals.map((meal, mIdx) => (
              <MealCard key={mIdx} meal={meal} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function MacroBar({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number | null;
  unit: string;
}) {
  const pct =
    target && target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm text-bone-muted">{label}</span>
        <span className="text-sm text-bone font-medium tabular-nums">
          {Math.round(value).toLocaleString("de-DE")}
          {target != null && (
            <span className="text-bone-faint">
              {" / "}
              {Math.round(target).toLocaleString("de-DE")} {unit}
            </span>
          )}
          {target == null && (
            <span className="text-bone-faint"> {unit}</span>
          )}
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
}

function MealCard({ meal }: { meal: Meal }) {
  const typeDe = mealTypeLabelDe(meal.meal_type);
  const emoji = mealTypeEmoji(meal.meal_type);
  const items = meal.items || [];

  return (
    <article>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-base">{emoji}</span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-caps text-gold font-medium">
              {typeDe}
            </p>
            <p className="font-serif text-base italic text-bone leading-tight mt-0.5">
              {meal.name || "Mahlzeit"}
            </p>
          </div>
        </div>
        {meal.total_kcal != null && (
          <span className="text-sm tabular-nums text-bone-muted flex-shrink-0">
            {Math.round(meal.total_kcal)} kcal
          </span>
        )}
      </div>

      {items.length > 0 && (
        <ul className="ml-6 space-y-1.5 mt-3">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-sm text-bone-muted truncate min-w-0 flex-1">
                {it.food || "—"}
                {it.grams != null && Number(it.grams) > 0 && (
                  <span className="text-bone-faint">
                    {" · "}
                    {Math.round(Number(it.grams))}g
                  </span>
                )}
              </span>
              {it.kcal != null && Number(it.kcal) > 0 && (
                <span className="text-[11px] tabular-nums text-bone-faint flex-shrink-0">
                  {Math.round(Number(it.kcal))} kcal
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {meal.notes && (
        <p className="ml-6 mt-3 text-[12px] text-bone-faint italic leading-relaxed">
          {meal.notes}
        </p>
      )}
    </article>
  );
}
