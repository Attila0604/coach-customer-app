// Skeleton-Loading für /me — wird automatisch von Next.js angezeigt,
// während die Server-Komponente (page.tsx) ihre Supabase-Queries lädt.
// Spiegelt das echte Layout (Hero, Wochen-Balken, Heute) für ruhiges Laden.

export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      {/* Header: "Coach" */}
      <header className="mb-12">
        <div className="skeleton h-5 w-20" />
      </header>

      {/* Hero: Eingeloggt + Begrüßung + Datum + Subtitle */}
      <section className="mb-10">
        <div className="skeleton h-3 w-24 mb-4" />
        <div className="skeleton h-9 w-3/4 mb-4" />
        <div className="skeleton h-4 w-1/2 mb-3" />
        <div className="skeleton h-4 w-2/3" />
      </section>

      {/* Diese Woche: 7 Balken */}
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <div className="skeleton h-3 w-28 mb-6" />
        <div className="flex items-end justify-between gap-2 h-20">
          {[40, 65, 50, 80, 35, 55, 45].map((h, idx) => (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center gap-2 h-full"
            >
              <div className="w-full flex-1 flex items-end">
                <div
                  className="skeleton w-full rounded-sm"
                  style={{ height: `${h}%` }}
                />
              </div>
              <div className="skeleton h-2.5 w-5" />
            </div>
          ))}
        </div>
      </section>

      {/* Heute: Check-in-Zeile + 4 Macro-Balken */}
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <div className="skeleton h-3 w-16 mb-6" />

        <div className="space-y-5">
          <div className="flex justify-between items-baseline gap-3">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-4 w-24" />
          </div>

          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <div className="skeleton h-4 w-16" />
                  <div className="skeleton h-4 w-24" />
                </div>
                <div className="skeleton h-1 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
