"use client";

// ============================================================================
// BottomNav — feste untere Tab-Leiste im nativen App-Stil.
// Milchglas-Hintergrund, aktive Hervorhebung in Gold, Tap-Feedback,
// Safe-Area für den Home-Indikator. Erscheint nur im /me-Bereich (via Layout).
// Icons sind Inline-SVGs (keine Bibliothek), Farbe über `currentColor`.
// ============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  isActive: (path: string) => boolean;
  icon: React.ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS: Tab[] = [
  {
    href: "/me",
    label: "Start",
    isActive: (p) => p === "/me",
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" {...stroke}>
        <path d="M3.5 11 12 4l8.5 7" />
        <path d="M5.5 9.8V20h13V9.8" />
      </svg>
    ),
  },
  {
    href: "/me/training",
    label: "Training",
    isActive: (p) => p.startsWith("/me/training"),
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" {...stroke}>
        <path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11" />
      </svg>
    ),
  },
  {
    href: "/me/nutrition",
    label: "Ernährung",
    isActive: (p) => p.startsWith("/me/nutrition"),
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" {...stroke}>
        <path d="M8 3v6M6 3v4.5a2 2 0 0 0 4 0V3M8 9v12" />
        <path d="M15.5 3C14 5 14 8 14 10.5h3.5V3M16 10.5V21" />
      </svg>
    ),
  },
  {
    href: "/me/progress",
    label: "Fortschritt",
    isActive: (p) => p.startsWith("/me/progress"),
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" {...stroke}>
        <path d="M4 18 9 12l4 3 7-8" />
        <path d="M16 7h4v4" />
      </svg>
    ),
  },
  {
    href: "/me/checkin",
    label: "Check-in",
    isActive: (p) => p.startsWith("/me/checkin"),
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" {...stroke}>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <path d="M9.5 4V3h5v1" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-50 select-none animate-nav-in"
    >
      <div
        className="mx-auto max-w-md border-t border-white/[0.08] bg-ink-900/80 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex items-stretch">
          {TABS.map((tab) => {
            const active = tab.isActive(pathname);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 transition-transform duration-150 active:scale-90 ${
                    active ? "text-gold" : "text-bone-faint"
                  }`}
                >
                  {tab.icon}
                  <span className="text-[10px] leading-none tracking-wide">
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
