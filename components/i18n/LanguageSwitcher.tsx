"use client";

// Kompakter Sprach-Umschalter (DE / IT / HU). Schreibt die Auswahl per
// Server-Action in das Kundenprofil und lädt die Ansicht neu.

import { useTransition } from "react";
import { setLanguage } from "@/lib/actions/language";
import type { Locale } from "@/lib/i18n";

const OPTIONS: { code: Locale; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "hu", label: "Magyar" },
];

export default function LanguageSwitcher({ current }: { current: Locale }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-ink-800/60 p-1">
      {OPTIONS.map((o) => {
        const active = current === o.code;
        return (
          <button
            key={o.code}
            type="button"
            aria-label={o.label}
            aria-pressed={active}
            disabled={pending}
            onClick={() => startTransition(() => setLanguage(o.code))}
            className={`px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wide transition-colors disabled:opacity-50 ${
              active ? "bg-gold/15 text-gold" : "text-bone-faint hover:text-bone-muted"
            }`}
          >
            {o.code}
          </button>
        );
      })}
    </div>
  );
}
