import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "coach_customer_id";

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

export default async function MePage() {
  const cookieStore = cookies();
  const customerId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!customerId) redirect("/");

  const admin = createAdminClient();

  // Customer laden
  const { data: customer } = await admin
    .from("customers")
    .select("first_name, telegram_username")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) redirect("/");

  const firstName = customer.first_name || "Member";
  const telegramUsername = customer.telegram_username || "";

  // Datums-Range für "heute"
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Letzter Check-in (defensiv: ignoriert Fehler falls Spalte/Tabelle anders heißt)
  let lastCheckinAt: string | null = null;
  try {
    const { data } = await admin
      .from("checkins")
      .select("created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastCheckinAt = data?.created_at ?? null;
  } catch {
    lastCheckinAt = null;
  }

  // Heutige Food-Logs (für Kalorien-Summe)
  let todayCalories = 0;
  try {
    const { data } = await admin
      .from("food_logs")
      .select("*")
      .eq("customer_id", customerId)
      .gte("created_at", startOfDay.toISOString());
    todayCalories = (data || []).reduce((sum: number, log: any) => {
      const cal = log.calories ?? log.kcal ?? 0;
      return sum + (Number(cal) || 0);
    }, 0);
  } catch {
    todayCalories = 0;
  }

  // Letzte 5 Food-Logs
  let recentLogs: any[] = [];
  try {
    const { data } = await admin
      .from("food_logs")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5);
    recentLogs = data || [];
  } catch {
    recentLogs = [];
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      {/* Header */}
      <header className="mb-12">
        <p className="font-serif text-base text-gold tracking-wide">Coach</p>
      </header>

      {/* Hero */}
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

      {/* Heute */}
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
          Heute
        </p>
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-bone-muted">Letzter Check-in</span>
            <span className="text-sm text-bone font-medium">
              {lastCheckinAt ? timeAgoDe(lastCheckinAt) : "—"}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-bone-muted">Kalorien heute</span>
            <span className="text-sm text-bone font-medium">
              {todayCalories > 0 ? `${Math.round(todayCalories)} kcal` : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* Aktivität */}
      <section className="mb-12 border-t border-white/[0.08] pt-8">
        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-5">
          Aktivität
        </p>
        {recentLogs.length > 0 ? (
          <ul className="space-y-4">
            {recentLogs.map((log, idx) => {
              const label =
                log.description ||
                log.food_name ||
                log.text ||
                log.content ||
                log.name ||
                "Mahlzeit";
              const cal = log.calories ?? log.kcal ?? null;
              return (
                <li
                  key={log.id ?? idx}
                  className="flex justify-between items-baseline gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-bone truncate">{label}</p>
                    <p className="text-[11px] text-bone-faint mt-0.5">
                      {timeAgoDe(log.created_at)}
                    </p>
                  </div>
                  {cal !== null && (
                    <span className="text-sm text-bone-muted flex-shrink-0">
                      {Math.round(Number(cal))} kcal
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-bone-faint italic">
            Noch keine Einträge. Logge im Telegram-Bot.
          </p>
        )}
      </section>

      {/* Footer / Logout */}
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
