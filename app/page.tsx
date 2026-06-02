"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Bitte Username eingeben");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Senden");
        setLoading(false);
        return;
      }

      router.push(`/login/verify?u=${encodeURIComponent(data.username)}`);
    } catch {
      setError("Netzwerk-Fehler");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <img src="/logo.webp" alt="Rákosi Gym" className="w-32 h-32 mb-10" />

        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Mitglieder
        </p>

        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          Willkommen.
        </h1>

        <p className="text-sm text-bone-muted leading-relaxed mb-8">
          Melde dich mit deinem Telegram-Konto an, um deinen persönlichen Bereich zu öffnen.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2 px-3.5 py-3 bg-white/[0.04] border border-white/[0.1] rounded-md focus-within:border-gold/40 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-gold flex-shrink-0"
              aria-hidden="true"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            <input
              id="telegram-username"
              name="username"
              type="text"
              placeholder="@dein_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-bone placeholder:text-bone-faint outline-none disabled:opacity-50"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-400/80 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-ink-900 text-sm font-medium rounded-md hover:bg-gold-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sende Code…" : "Code anfordern"}
          </button>
        </form>

        <p className="text-[11px] text-bone-faint text-center mt-8">
          Erstes Mal? Schreib zuerst dem Bot.
        </p>
      </div>
    </main>
  );
}
