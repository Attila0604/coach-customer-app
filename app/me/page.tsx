export default function MePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="font-serif text-base text-gold mb-12 tracking-wide">
          Coach
        </p>

        <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
          Eingeloggt
        </p>

        <h1 className="font-serif text-4xl text-bone leading-tight mb-3 font-normal">
          Willkommen.
        </h1>

        <p className="text-sm text-bone-muted leading-relaxed mb-8">
          Du bist erfolgreich eingeloggt.
        </p>

        <p className="text-[11px] text-bone-faint">
          Deine Member-Area kommt in Phase 4.
        </p>
      </div>
    </main>
  );
}
