'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCheckin, type CheckinInput } from '@/lib/actions/checkin';
import { getDict, type Locale } from '@/lib/i18n';

type Props = {
  initial: CheckinInput;
  alreadyCheckedIn: boolean;
  locale: Locale;
};

function RatingPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-caps text-bone-faint font-medium block mb-2.5">
        {label}
      </label>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? null : n)}
              className={`aspect-square text-[11px] tabular-nums rounded-sm border transition ${
                active
                  ? 'border-gold bg-gold/15 text-gold font-medium'
                  : 'border-white/[0.1] text-bone-muted hover:border-white/30'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CheckinForm({ initial, alreadyCheckedIn, locale }: Props) {
  const d = getDict(locale).checkin;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [weight, setWeight] = useState(
    initial.weight_kg != null ? String(initial.weight_kg) : ''
  );
  const [waist, setWaist] = useState(
    initial.waist_cm != null ? String(initial.waist_cm) : ''
  );
  const [mood, setMood] = useState<number | null>(initial.mood_rating);
  const [energy, setEnergy] = useState<number | null>(initial.energy_rating);
  const [sleep, setSleep] = useState<number | null>(initial.sleep_rating);
  const [notes, setNotes] = useState(initial.notes ?? '');

  function parseNum(s: string): number | null {
    const t = s.trim().replace(',', '.');
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (weight.trim() && parseNum(weight) == null) {
      setError(d.errWeight);
      return;
    }
    if (waist.trim() && parseNum(waist) == null) {
      setError(d.errWaist);
      return;
    }

    const payload: CheckinInput = {
      weight_kg: parseNum(weight),
      waist_cm: parseNum(waist),
      mood_rating: mood,
      energy_rating: energy,
      sleep_rating: sleep,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      const result = await saveCheckin(payload);
      if (result.ok) {
        setDone(true);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([40, 30, 60]);
        }
        setTimeout(() => router.push('/me'), 900);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="border border-gold/30 bg-gold/[0.05] p-8 text-center">
        <p className="font-serif text-2xl text-bone mb-2">{d.savedTitle}</p>
        <p className="text-sm text-bone-muted">{d.savedBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {alreadyCheckedIn && (
        <p className="text-[12px] text-bone-faint italic">
          {d.alreadyChecked}
        </p>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-caps text-bone-faint font-medium block mb-2.5">
          {d.weightLabel}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={d.weightPlaceholder}
          className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-3 text-lg text-bone tabular-nums rounded-md outline-none focus:border-gold/40 transition"
        />
      </div>

      <RatingPicker label={d.mood} value={mood} onChange={setMood} />
      <RatingPicker label={d.energy} value={energy} onChange={setEnergy} />
      <RatingPicker label={d.sleep} value={sleep} onChange={setSleep} />

      <div>
        <label className="text-[10px] uppercase tracking-caps text-bone-faint font-medium block mb-2.5">
          {d.waistLabel}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={waist}
          onChange={(e) => setWaist(e.target.value)}
          placeholder={d.waistPlaceholder}
          className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-3 text-lg text-bone tabular-nums rounded-md outline-none focus:border-gold/40 transition"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-caps text-bone-faint font-medium block mb-2.5">
          {d.noteLabel}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={d.notePlaceholder}
          className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-3 text-sm text-bone rounded-md outline-none focus:border-gold/40 transition resize-none"
        />
      </div>

      {error && <p className="text-[12px] text-red-400/80">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 bg-gold text-ink-900 text-sm font-medium rounded-md hover:bg-gold-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? d.saving : d.save}
      </button>
    </form>
  );
}
