// Skeleton-Loading für /me/checkin — zeigt Next.js automatisch, während die
// Server-Komponente den bestehenden Check-in der Woche lädt. Spiegelt das echte
// Layout (Back-Link, Hero mit Label/Titel/Wochen-Zeile, Formular-Felder).

export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      {/* Back-Link */}
      <header className="mb-10">
        <div className="skeleton h-3 w-20" />
      </header>

      {/* Hero */}
      <section className="mb-10">
        <div className="skeleton h-2.5 w-40 mb-3" />
        <div className="skeleton h-9 w-3/4 mb-3" />
        <div className="skeleton h-4 w-2/3" />
      </section>

      {/* Formular-Felder */}
      <section className="border-t border-white/[0.08] pt-8 space-y-8">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="skeleton h-2.5 w-24 mb-3" />
            <div className="skeleton h-10 w-full rounded-sm" />
          </div>
        ))}

        {/* Drei Bewertungs-Skalen (Stimmung, Energie, Schlaf) */}
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="skeleton h-2.5 w-20 mb-3" />
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j} className="skeleton h-10 flex-1 rounded-sm" />
              ))}
            </div>
          </div>
        ))}

        {/* Notiz-Feld + Speichern-Button */}
        <div>
          <div className="skeleton h-2.5 w-16 mb-3" />
          <div className="skeleton h-20 w-full rounded-sm" />
        </div>
        <div className="skeleton h-11 w-full rounded-sm" />
      </section>
    </main>
  );
}
