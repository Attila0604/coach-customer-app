"use client";

import { useEffect } from "react";

// Registriert den Service-Worker (macht die App installierbar / app-tauglich).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* still: Registrierung ist best-effort */
      });
    }
  }, []);
  return null;
}
