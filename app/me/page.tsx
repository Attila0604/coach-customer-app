import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "coach_customer_id";

const MEAL_TYPE_DE: Record<string, string> = {
  breakfast: "Frühstück",
  lunch: "Mittagessen",
  dinner: "Abendessen",
  snack: "Snack",
};

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

function formatMealLabel(meal_type: string | null, raw_description: string | null): string {
  const desc = raw_description || "Mahlzeit";
  const typeKey = meal_type?.toLowerCase();
  const typeDe = typeKey ? MEAL_TYPE_DE[typeKey] || meal_type : null;
  return typeDe ? `${typeDe}: ${desc}` : desc;
}

export default async function MePage() {
  const cookieStore = cookies();
  const customerId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!customerId) redirect("/");

  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("first_name, telegram_username")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) redirect("/");

  const firstName = customer.first_name || "Member";
  const telegramUsername = customer.telegram_username || "";

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { data: lastCheckin } = await admin
    .from("checkins")
    .select("created_at")
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

  const { data: recentLogs } = await admin
    .from("food_logs")
    .select("id, meal_type, raw_description, total_kcal, logged_at")
    .eq("customer_id", customerId)
    .order("logged_at", { ascending: false })
    .limit(5);

  const logs = recentLogs || [];

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
          Hallo, {firstName}.
        </h1>
        <p className="text-sm text-bone-muted leading-relaxed">
          {formatDateDe(now)}
        </p>
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
          Heute
        </p>
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-bone-muted">Letzter Check-in</span>
            <span className="text-sm text-bone font-medium">
              {lastCheckin ? timeAgoDe(lastCheckin.created_at) : "—"}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-bone-muted">Kalorien</span>
            <span className="text-sm text-bone font-medium">
              {todayTotals.kcal > 0
                ? `${todayTotals.kcal.toLocaleString("de-DE")} kcal`
                : "—"}
            </span>
          </div>
          {todayTotals.kcal > 0 && (
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-bone-muted">Makros</span>
              <span className="text-sm text-bone font-medium tabular-nums">
                {Math.round(todayTotals.protein)}P · {Math.round(todayTotals.carbs)}C · {Math.round(todayTotals.fat)}F
              </span>
            </div>
          )}
        </div>
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
