// Skeleton-Loading für /me/training/history — spiegelt Header + Sessionliste.

export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      <header className="mb-10">
        <div className="skeleton h-3 w-28" />
      </header>

      <section className="mb-10">
        <div className="skeleton h-3 w-20 mb-4" />
        <div className="skeleton h-9 w-2/3 mb-4" />
        <div className="skeleton h-4 w-1/2" />
      </section>

      <section className="mb-8 border-t border-white/[0.08] pt-8">
        <div className="skeleton h-3 w-32 mb-6" />
        <ul className="space-y-6">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="border-l-2 border-white/[0.08] pl-4">
              <div className="flex justify-between items-baseline gap-3 mb-2">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-3 w-20" />
              </div>
              <div className="skeleton h-3 w-40 mb-2" />
              <div className="skeleton h-3 w-32" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
