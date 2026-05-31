// Skeleton-Loading für /me/training/session/[sessionId] — zeigt Next.js
// automatisch, während die Server-Komponente die Session + Übungen lädt
// (bevor der client-seitige WorkoutPlayer übernimmt). Spiegelt grob den
// Player-Aufbau (Kopf mit Titel/Fortschritt, aktuelle Übung, Satz-Reihen).

export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      {/* Kopf: Übungs-Titel + Fortschritt */}
      <header className="mb-10">
        <div className="skeleton h-2.5 w-28 mb-3" />
        <div className="skeleton h-8 w-2/3 mb-4" />
        <div className="skeleton h-1.5 w-full rounded-full" />
      </header>

      {/* Aktuelle Übung */}
      <section className="mb-10 p-5 border border-white/[0.08]">
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-7 w-1/2 mb-5" />

        {/* Satz-Reihen */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-9 w-9 rounded-sm" />
              <div className="skeleton h-9 flex-1 rounded-sm" />
              <div className="skeleton h-9 flex-1 rounded-sm" />
            </div>
          ))}
        </div>
      </section>

      {/* Aktions-Button */}
      <div className="skeleton h-11 w-full rounded-sm" />
    </main>
  );
}
