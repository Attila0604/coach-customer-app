'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startWorkoutSession } from '@/lib/actions/workout';
import { getDict, type Locale } from '@/lib/i18n';

type Variant = 'primary' | 'subtle';

export default function StartWorkoutButton({
  dayId,
  label,
  variant = 'primary',
  locale,
}: {
  dayId: string;
  label?: string;
  variant?: Variant;
  locale: Locale;
}) {
  const d = getDict(locale).training;
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

  if (variant === 'subtle') {
    return (
      <div>
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="text-[10px] uppercase tracking-caps font-medium px-3 py-2 border border-gold/40 text-gold/90 hover:bg-gold/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isPending ? d.starting : label || d.startDay}
        </button>
        {error && (
          <p className="text-[11px] text-red-400 italic mt-1.5">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full text-[12px] uppercase tracking-caps font-medium px-6 py-4 border border-gold text-gold bg-gold/5 hover:bg-gold/15 transition disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isPending ? d.starting : label || d.startWorkout}
      </button>
      {error && (
        <p className="text-[11px] text-red-400 italic mt-2">{error}</p>
      )}
    </div>
  );
}
