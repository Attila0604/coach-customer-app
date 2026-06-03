// Zentrale i18n-Hilfen. Bewusst "rein" (keine Server-Imports), damit diese
// Datei sowohl in Server- als auch in Client-Komponenten genutzt werden kann.

import { de, type Dict } from "./de";
import { it } from "./it";
import { hu } from "./hu";

export type Locale = "de" | "it" | "hu";
export type { Dict };

export const LOCALES: Locale[] = ["de", "it", "hu"];
export const DEFAULT_LOCALE: Locale = "de";

const dicts: Record<Locale, Dict> = { de, it, hu };

export function getDict(locale: Locale): Dict {
  return dicts[locale] ?? de;
}

// Normalisiert einen beliebigen Wert (z. B. aus der DB) auf eine gültige Sprache.
export function resolveLocale(value: string | null | undefined): Locale {
  return value === "it" || value === "hu" ? value : "de";
}
