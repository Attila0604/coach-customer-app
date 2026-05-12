export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="font-serif text-base text-gold mb-12 tracking-wide">
          Coach
        </p>

        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Mitglieder
        </p>

        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          Willkommen.
        </h1>

        <p className="text-sm text-bone-muted leading-relaxed mb-8">
          Melde dich mit deinem Telegram-Konto an, um deinen persönlichen Bereich zu öffnen.
        </p>

        <form className="space-y-3">
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
              type="text"
              placeholder="@dein_username"
              className="flex-1 bg-transparent text-sm text-bone placeholder:text-bone-faint outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gold text-ink-900 text-sm font-medium rounded-md hover:bg-gold-soft transition-colors"
          >
            Code anfordern
          </button>
        </form>

        <p className="text-[11px] text-bone-faint text-center mt-8">
          Erstes Mal? Schreib zuerst dem Bot.
        </p>
      </div>
    </main>
  );
}
