// Skeleton-Loading für /me/training — zeigt Next.js automatisch,
// während die Server-Komponente lädt. Spiegelt das echte Layout
// (Back-Link, Hero, Heutiges Workout, Wochen-Fortschritt, Trainingstage).

export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      {/* Back-Link */}
      <div className="skeleton h-3 w-24 mb-8" />

      {/* Header */}
      <header className="mb-12">
        <div className="skeleton h-5 w-20" />
      </header>

      {/* Heutiges Workout — CTA-Karte */}
      <section className="mb-10 p-5 border border-white/[0.08]">
        <div className="skeleton h-2.5 w-28 mb-3" />
        <div className="skeleton h-5 w-2/3 mb-4" />
        <div className="skeleton h-9 w-40" />
      </section>

      {/* Hero */}
      <section className="mb-10">
        <div className="skeleton h-3 w-24 mb-4" />
        <div className="skeleton h-9 w-3/4" />
      </section>

      {/* Wochen-Fortschritt */}
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <div className="skeleton h-3 w-32 mb-5" />
        <div className="flex justify-between gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="skeleton h-9 w-full rounded-sm" />
              <div className="skeleton h-2.5 w-5" />
            </div>
          ))}
        </div>
      </section>

      {/* Trainingstage — zwei Block-Platzhalter */}
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <div className="skeleton h-3 w-28 mb-5" />
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-3">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-3 w-12" />
              </div>
              <div className="skeleton h-7 w-1/2 mb-4" />
              <div className="space-y-2.5">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-4/6" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
