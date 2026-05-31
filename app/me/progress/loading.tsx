// Skeleton-Loading für /me/progress — spiegelt Header, Kennzahlen und Chart.

export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-md mx-auto">
      <header className="mb-10">
        <div className="skeleton h-3 w-20" />
      </header>

      <section className="mb-10">
        <div className="skeleton h-3 w-24 mb-4" />
        <div className="skeleton h-9 w-2/3 mb-4" />
        <div className="skeleton h-4 w-3/4" />
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-white/[0.08] px-4 py-4">
              <div className="skeleton h-2.5 w-10 mb-3" />
              <div className="skeleton h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="skeleton h-4 w-1/2" />
      </section>

      <section className="mb-10 border-t border-white/[0.08] pt-8">
        <div className="skeleton h-3 w-32 mb-6" />
        <div className="skeleton h-32 w-full rounded-md" />
      </section>
    </main>
  );
}
