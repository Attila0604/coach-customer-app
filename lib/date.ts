// ============================================================================
// Zeitzonen-Helfer — alles in Europe/Vienna, konsistent mit dem Coach-Dashboard.
// Vercel läuft auf UTC, daher NIE setHours()/getDate()/getDay() (= Server-Zeit)
// für "heute"-Berechnungen verwenden. Diese Helfer sind DST-sicher.
// ============================================================================

export const TZ = "Europe/Vienna";

// "YYYY-MM-DD" in Wien-Lokalzeit (DST-sicher).
// Strings dieser Form vergleichen sich chronologisch (a < b etc.).
export function viennaDateKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}

// Wiens UTC-Offset (ms) zu einem Zeitpunkt — +1h Winter, +2h Sommer (DST-sicher).
export function viennaOffsetMs(at: Date): number {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at)) {
    p[part.type] = part.value;
  }
  const hour = p.hour === "24" ? 0 : Number(p.hour);
  const asWall = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    hour,
    Number(p.minute),
    Number(p.second)
  );
  return asWall - at.getTime();
}

// UTC-Instant von Wien-Mitternacht für den Wien-Tag, der `d` enthält (Mittag-Anker).
export function viennaStartOfDayUtc(d: Date = new Date()): Date {
  const key = viennaDateKey(d);
  const offset = viennaOffsetMs(new Date(`${key}T12:00:00Z`));
  return new Date(new Date(`${key}T00:00:00Z`).getTime() - offset);
}

// Mittag-UTC-Anker des Wien-Tags von `d` — sicher fürs Tag-für-Tag-Springen
// (Mittag überschreitet bei keinem realen UTC-Offset eine Tagesgrenze).
export function viennaNoonAnchor(d: Date): Date {
  return new Date(`${viennaDateKey(d)}T12:00:00Z`);
}

// Wochentag in Wien als JS-Day: 0=So, 1=Mo, ..., 6=Sa.
export function viennaDow(d: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

// "YYYY-MM-DD" des Montags der Wien-Woche, die `d` enthält.
// Passt zur checkins.week_of-Konvention (Montag als Wochen-Anker).
export function viennaMondayKey(d: Date = new Date()): string {
  const anchor = viennaNoonAnchor(d);
  const dow = viennaDow(anchor); // 0=So .. 6=Sa
  const diff = dow === 0 ? -6 : 1 - dow; // zurück zum Montag
  anchor.setUTCDate(anchor.getUTCDate() + diff);
  return viennaDateKey(anchor);
}
