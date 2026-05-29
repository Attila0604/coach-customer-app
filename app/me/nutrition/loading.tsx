// Skeleton-Loading für /me/nutrition — zeigt Next.js automatisch,
// während die Server-Komponente lädt. Spiegelt das echte Layout
// (Back-Link, Hero, Tagesziele/Macros, Tag-Tabs, Mahlzeiten).

export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      {/* Header mit Back-Link */}
      <header className="mb-10">
        <div className="skeleton h-3 w-24" />
      </header>

      {/* Hero */}
      <section className="mb-10">
        <div className="skeleton h-3 w-28 mb-4" />
        <div className="skeleton h-9 w-3/4" />
      </section>

      {/* Tagesziele / Macros */}
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <div className="skeleton h-3 w-24 mb-6" />
        <div className="space-y-3">
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
      </section>

      {/* Tag-Tabs */}
      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <div className="skeleton h-3 w-28 mb-5" />
        <div className="flex gap-2 mb-6">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-7 flex-1 rounded-sm" />
          ))}
        </div>

        {/* Mahlzeiten-Karten */}
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-3">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-14" />
              </div>
              <div className="skeleton h-6 w-2/3 mb-3" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
