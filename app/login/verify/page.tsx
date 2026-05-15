"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("u") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      router.replace("/");
    }
  }, [username, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Code muss 6 Stellen haben");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Code ungültig");
        setLoading(false);
        return;
      }

      router.push("/me");
    } catch {
      setError("Netzwerk-Fehler");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="font-serif text-base text-gold mb-12 tracking-wide">
          Coach
        </p>

        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Bestätigung
        </p>

        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          Code prüfen.
        </h1>

        <p className="text-sm text-bone-muted leading-relaxed mb-8">
          Wir haben dir einen 6-stelligen Code an{" "}
          <span className="text-bone">@{username}</span> geschickt.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2 px-3.5 py-3 bg-white/[0.04] border border-white/[0.1] rounded-md focus-within:border-gold/40 transition-colors">
            <input
              id="verify-code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              className="flex-1 bg-transparent text-center text-lg text-bone placeholder:text-bone-faint outline-none tracking-[0.5em] font-mono disabled:opacity-50"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-400/80 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 bg-gold text-ink-900 text-sm font-medium rounded-md hover:bg-gold-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Prüfe…" : "Bestätigen"}
          </button>
        </form>

        <p className="text-[11px] text-bone-faint text-center mt-8">
          Kein Code erhalten?{" "}
          <Link href="/" className="text-bone-muted hover:text-bone underline">
            Erneut anfordern
          </Link>
        </p>
      </div>
    </main>
  );
}
