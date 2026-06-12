// ============================================================================
// Mahlzeit-Typen — zentrale, robuste Zuordnung.
//
// Im System existieren ZWEI Schreibweisen für meal_type:
//  - food_logs (vom Telegram-Bot):   deutsch  → fruehstueck / mittag / abend / snack
//  - meal_plans.meals (Coach-App):   englisch → breakfast / lunch / dinner / snack
//
// Dieses Modul normalisiert beide auf einen kanonischen Key und liefert
// deutsche Labels, Emojis und eine Sortierreihenfolge. So ist die Konsumseite
// unabhängig davon, welche Konvention ein einzelner Datensatz nutzt.
// ============================================================================

import type { Locale } from "@/lib/i18n";

export type MealTypeKey = "breakfast" | "lunch" | "dinner" | "snack";

const ALIASES: Record<string, MealTypeKey> = {
  // breakfast
  breakfast: "breakfast",
  "frühstück": "breakfast",
  fruehstueck: "breakfast",
  fruhstuck: "breakfast",
  // lunch
  lunch: "lunch",
  mittag: "lunch",
  mittagessen: "lunch",
  // dinner
  dinner: "dinner",
  abend: "dinner",
  abendessen: "dinner",
  // snack
  snack: "snack",
};

const LABEL_DE: Record<MealTypeKey, string> = {
  breakfast: "Frühstück",
  lunch: "Mittagessen",
  dinner: "Abendessen",
  snack: "Snack",
};

const LABEL_BY_LOCALE: Record<Locale, Record<MealTypeKey, string>> = {
  de: LABEL_DE,
  it: { breakfast: "Colazione", lunch: "Pranzo", dinner: "Cena", snack: "Spuntino" },
  hu: { breakfast: "Reggeli", lunch: "Ebéd", dinner: "Vacsora", snack: "Snack" },
};

const FALLBACK_BY_LOCALE: Record<Locale, string> = {
  de: "Mahlzeit",
  it: "Pasto",
  hu: "Étkezés",
};

const EMOJI: Record<MealTypeKey, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

const ORDER: Record<MealTypeKey, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

// Normalisiert eine beliebige Schreibweise auf den kanonischen Key (oder null).
export function normalizeMealType(
  raw: string | null | undefined
): MealTypeKey | null {
  if (!raw) return null;
  return ALIASES[raw.toLowerCase().trim()] ?? null;
}

// Deutsches Label. Unbekannte Werte werden — falls vorhanden — kapitalisiert
// durchgereicht, sonst auf `fallback` zurückgefallen.
export function mealTypeLabelDe(
  raw: string | null | undefined,
  fallback = "Mahlzeit"
): string {
  const key = normalizeMealType(raw);
  if (key) return LABEL_DE[key];
  if (raw && raw.trim()) {
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  return fallback;
}

// Sprachabhängiges Label (de | it | hu).
export function mealTypeLabel(
  raw: string | null | undefined,
  locale: Locale,
  fallback?: string
): string {
  const key = normalizeMealType(raw);
  if (key) return LABEL_BY_LOCALE[locale][key];
  if (raw && raw.trim()) {
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  return fallback ?? FALLBACK_BY_LOCALE[locale];
}

export function mealTypeEmoji(raw: string | null | undefined): string {
  const key = normalizeMealType(raw);
  return key ? EMOJI[key] : "🍽️";
}

// Sortier-Index (unbekannte ans Ende).
export function mealTypeOrder(raw: string | null | undefined): number {
  const key = normalizeMealType(raw);
  return key ? ORDER[key] : 99;
}

// ============================================================================
// Übersetzte Mahlzeiten (nicht-destruktiv).
// Das deutsche Original liegt in meal_plans.meals, Übersetzungen in
// meal_plans.translations[locale]. Für 'de' (oder fehlende Übersetzung)
// wird auf das deutsche Original zurückgefallen.
// ============================================================================
export function localizedMeals(
  row: { meals?: unknown; translations?: unknown } | null | undefined,
  locale: Locale
): any[] {
  if (!row) return [];
  if (locale !== "de") {
    const tr = (row.translations as Record<string, unknown> | null | undefined)?.[
      locale
    ];
    if (Array.isArray(tr)) return tr as any[];
  }
  return Array.isArray(row.meals) ? (row.meals as any[]) : [];
}
