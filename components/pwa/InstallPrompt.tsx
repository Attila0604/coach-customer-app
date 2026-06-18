"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
};

// Dezenter Hinweis, dass man die App zum Startbildschirm hinzufügen kann.
// Android/Chrome: echter Installier-Button. iOS/Safari: Kurzanleitung.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<"none" | "android" | "ios">("none");

  useEffect(() => {
    // Schon als App installiert? -> nichts anzeigen.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;
    try {
      if (sessionStorage.getItem("rgym-install-dismissed")) return;
    } catch {
      /* ignore */
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari kennt 'beforeinstallprompt' nicht -> manueller Hinweis.
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = isIOS && !/crios|fxios/.test(ua);
    if (isIOS && isSafari) setMode("ios");

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (mode === "none") return null;

  function dismiss() {
    try {
      sessionStorage.setItem("rgym-install-dismissed", "1");
    } catch {
      /* ignore */
    }
    setMode("none");
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-sm rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3 shadow-xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="text-xl leading-none">📲</div>
        <div className="flex-1 text-[13px] leading-snug text-bone">
          {mode === "android" ? (
            <>App zum Startbildschirm hinzufügen — öffnet ohne Browser, wie eine echte App.</>
          ) : (
            <>
              Als App speichern: unten auf <b>Teilen</b> tippen → <b>„Zum
              Home-Bildschirm"</b>.
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={dismiss}
          className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-bone-muted hover:text-bone"
        >
          Später
        </button>
        {mode === "android" && (
          <button
            onClick={install}
            className="rounded-md bg-gold px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-900"
          >
            Installieren
          </button>
        )}
      </div>
    </div>
  );
}
