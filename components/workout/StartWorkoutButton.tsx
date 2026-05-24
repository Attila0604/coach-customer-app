'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startWorkoutSession } from '@/lib/actions/workout';

export default function StartWorkoutButton({
  dayId,
  label = '▶ Training starten',
}: {
  dayId: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startWorkoutSession(dayId);
      if (result.ok) {
        router.push(`/me/training/session/${result.sessionId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full text-[12px] uppercase tracking-caps font-medium px-6 py-4 border border-gold text-gold bg-gold/5 hover:bg-gold/15 transition disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isPending ? 'Starte ...' : label}
      </button>
      {error && (
        <p className="text-[11px] text-red-400 italic mt-2">{error}</p>
      )}
    </div>
  );
}
