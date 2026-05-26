'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  logSet,
  completeWorkoutSession,
  abortWorkoutSession,
  pauseWorkoutSession,
  resumeWorkoutSession,
} from '@/lib/actions/workout';

type Exercise = {
  id: string;
  sort_order: number;
  name: string;
  sets: number | null;
  reps_min: number | null;
  reps_max: number | null;
  weight_kg: number | null;
  weight_type: string | null;
  notes: string | null;
  rest_seconds: number | null;
};

type WorkoutLog = {
  id: string;
  exercise_id: string;
  set_number: number;
  reps_done: number | null;
  weight_used_kg: number | null;
};

type Session = {
  id: string;
  status: string;
  started_at: string;
  day_id: string;
  training_days: {
    id: string;
    title: string;
    subtitle: string | null;
    day_number: number;
    exercises: Exercise[];
  };
  workout_logs: WorkoutLog[];
};

type CompletionStats = {
  durationSeconds: number;
  totalSets: number;
  totalVolume: number;
  exercisesCompleted: number;
  personalRecords: Array<{
    exercise: string;
    previousMax: number | null;
    newMax: number;
  }>;
};

function formatReps(min: number | null, max: number | null): string {
  if (min == null && max == null) return '';
  if (min === max || max == null) return `${min}`;
  if (min == null) return `${max}`;
  return `${min}-${max}`;
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return `${min} Min ${sec > 0 ? sec + 's' : ''}`.trim();
}

function formatTimerMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Berechne: welche Übung + welcher nächste Satz?
function determineStartPosition(
  exercises: Exercise[],
  logs: WorkoutLog[]
): { exerciseIdx: number; nextSetNumber: number } {
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const exLogs = logs.filter((l) => l.exercise_id === ex.id);
    const completedSets = exLogs.length;
    const targetSets = ex.sets || 3;
    if (completedSets < targetSets) {
      return { exerciseIdx: i, nextSetNumber: completedSets + 1 };
    }
  }
  // Alle Übungen fertig → letzter Index, "next" wäre virtuell
  return { exerciseIdx: exercises.length - 1, nextSetNumber: (exercises[exercises.length - 1]?.sets || 1) + 1 };
}

export default function WorkoutPlayer({ session }: { session: Session }) {
  const router = useRouter();

  const exercises = [...session.training_days.exercises].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const day = session.training_days;

  // State
  const [logs, setLogs] = useState<WorkoutLog[]>(session.workout_logs || []);
  const initial = determineStartPosition(exercises, logs);
  const [currentExIdx, setCurrentExIdx] = useState(initial.exerciseIdx);
  const [currentSet, setCurrentSet] = useState(initial.nextSetNumber);

  const [repsInput, setRepsInput] = useState('');
  const [weightInput, setWeightInput] = useState('');

  const [isResting, setIsResting] = useState(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(session.status === 'paused');
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const currentExercise = exercises[currentExIdx];
  const totalSets = exercises.reduce((sum, e) => sum + (e.sets || 0), 0);
  const completedSets = logs.length;
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const currentExLogs = logs.filter((l) => l.exercise_id === currentExercise?.id);
  const isLastSetOfExercise =
    currentExercise && currentSet >= (currentExercise.sets || 1);
  const isLastExercise = currentExIdx >= exercises.length - 1;
  const isFinalSet = isLastSetOfExercise && isLastExercise;

  // Rest-Timer
  useEffect(() => {
    if (!isResting || restSecondsLeft <= 0) {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
      }
      if (isResting && restSecondsLeft <= 0) {
        // Timer ended
        setIsResting(false);
        // Haptik
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([100, 30, 100]);
        }
      }
      return;
    }
    restIntervalRef.current = setInterval(() => {
      setRestSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [isResting, restSecondsLeft]);

  // Set-Done Handler
  function handleSetDone() {
    if (!currentExercise) return;
    const reps = repsInput ? parseInt(repsInput, 10) : null;
    const weight = weightInput ? parseFloat(weightInput.replace(',', '.')) : null;

    if (reps != null && (isNaN(reps) || reps < 0)) {
      setError('Reps müssen eine positive Zahl sein.');
      return;
    }
    if (weight != null && (isNaN(weight) || weight < 0)) {
      setError('Gewicht muss eine positive Zahl sein.');
      return;
    }
    setError(null);

    // Haptik
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }

    startTransition(async () => {
      const result = await logSet(
        session.id,
        currentExercise.id,
        currentSet,
        reps,
        weight
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Optimistic update of logs
      setLogs((prev) => [
        ...prev,
        {
          id: result.logId,
          exercise_id: currentExercise.id,
          set_number: currentSet,
          reps_done: reps,
          weight_used_kg: weight,
        },
      ]);
      setRepsInput('');
      setWeightInput('');

      // Letzter Satz der letzten Übung → Workout abschließen
      if (isFinalSet) {
        handleComplete();
        return;
      }

      // Letzter Satz dieser Übung → nächste Übung (kein Rest)
      if (isLastSetOfExercise) {
        setCurrentExIdx((idx) => idx + 1);
        setCurrentSet(1);
      } else {
        // Innerhalb der Übung → nächster Satz + Rest-Timer
        setCurrentSet((s) => s + 1);
        const restSec = currentExercise.rest_seconds || 60;
        setRestSecondsLeft(restSec);
        setIsResting(true);
      }
    });
  }

  function handleSkipRest() {
    setIsResting(false);
    setRestSecondsLeft(0);
  }

  function handleSkipExercise() {
    setShowSkipConfirm(true);
  }

  function confirmSkipExercise() {
    setShowSkipConfirm(false);
    if (isLastExercise) {
      handleComplete();
      return;
    }
    setCurrentExIdx((idx) => idx + 1);
    setCurrentSet(1);
    setRepsInput('');
    setWeightInput('');
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeWorkoutSession(session.id);
      if (result.ok) {
        setCompletionStats(result.stats);
        // Haptik success
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([50, 30, 50, 30, 100]);
        }
      } else {
        setError(result.error);
      }
    });
  }

  function handlePause() {
    startTransition(async () => {
      const result = await pauseWorkoutSession(session.id);
      if (result.ok) {
        setIsPaused(true);
        router.push('/me/training');
      } else {
        setError(result.error);
      }
    });
  }

  function handleAbort() {
    setShowAbortConfirm(true);
  }

  function confirmAbort() {
    setShowAbortConfirm(false);
    startTransition(async () => {
      const result = await abortWorkoutSession(session.id);
      if (result.ok) {
        router.push('/me/training');
      } else {
        setError(result.error);
      }
    });
  }

  function handleResume() {
    startTransition(async () => {
      const result = await resumeWorkoutSession(session.id);
      if (result.ok) {
        setIsPaused(false);
      } else {
        setError(result.error);
      }
    });
  }

  // COMPLETION SCREEN
  if (completionStats) {
    return (
      <main className="min-h-screen px-6 py-12 max-w-md mx-auto flex flex-col">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-4 text-center">
            Workout abgeschlossen
          </p>
          <h1 className="font-serif text-4xl text-bone leading-tight text-center mb-8">
            {day.title}
          </h1>

          <div className="space-y-4 border-t border-b border-white/[0.08] py-8 mb-8">
            <Stat label="Dauer" value={formatDuration(completionStats.durationSeconds)} />
            <Stat label="Übungen" value={`${completionStats.exercisesCompleted} / ${exercises.length}`} />
            <Stat label="Sätze gesamt" value={`${completionStats.totalSets}`} />
            {completionStats.totalVolume > 0 && (
              <Stat label="Gesamt-Volumen" value={`${completionStats.totalVolume} kg`} />
            )}
          </div>

          {completionStats.personalRecords.length > 0 && (
            <div className="mb-8 p-6 bg-gold/[0.05] border border-gold/30">
              <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-3">
                🏆 Persönlicher Rekord
              </p>
              {completionStats.personalRecords.map((pr, i) => (
                <div key={i} className="text-sm text-bone mb-1">
                  <span className="font-medium">{pr.exercise}</span>
                  <span className="text-bone-muted">
                    {' · '}
                    {pr.newMax} kg
                    {pr.previousMax != null && ` (vorher ${pr.previousMax} kg)`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => router.push('/me/training')}
            className="w-full text-[11px] uppercase tracking-caps font-medium px-5 py-3 border border-bone/30 text-bone hover:bg-white/[0.04] transition"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </main>
    );
  }

  // PAUSED SCREEN
  if (isPaused) {
    return (
      <main className="min-h-screen px-6 py-12 max-w-md mx-auto flex flex-col">
        <div className="flex-1 flex flex-col justify-center text-center">
          <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-4">
            Workout pausiert
          </p>
          <h1 className="font-serif text-3xl text-bone mb-3">{day.title}</h1>
          <p className="text-sm text-bone-muted mb-8">
            {completedSets} von {totalSets} Sätzen abgeschlossen
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResume}
              disabled={isPending}
              className="w-full text-[12px] uppercase tracking-caps font-medium px-6 py-4 border border-gold text-gold bg-gold/5 hover:bg-gold/15 transition disabled:opacity-30"
            >
              ▶ Fortsetzen
            </button>
            <button
              type="button"
              onClick={handleAbort}
              disabled={isPending}
              className="w-full text-[11px] uppercase tracking-caps font-medium px-5 py-3 border border-white/15 text-bone-muted hover:text-red-400 hover:border-red-400/40 transition disabled:opacity-30"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </main>
    );
  }

  // MAIN PLAYER UI
  return (
    <main className="min-h-screen flex flex-col bg-black">
      {showAbortConfirm && (
        <ConfirmModal
          title="Workout abbrechen?"
          message="Bisherige Sätze bleiben gespeichert. Du kannst dieses Workout nicht fortsetzen."
          confirmLabel="Ja, abbrechen"
          confirmStyle="danger"
          onConfirm={confirmAbort}
          onCancel={() => setShowAbortConfirm(false)}
        />
      )}
      {showSkipConfirm && (
        <ConfirmModal
          title="Übung überspringen?"
          message="Du gehst direkt zur nächsten Übung weiter."
          confirmLabel="Ja, überspringen"
          confirmStyle="primary"
          onConfirm={confirmSkipExercise}
          onCancel={() => setShowSkipConfirm(false)}
        />
      )}
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-black border-b border-white/[0.06] px-6 py-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handlePause}
          disabled={isPending}
          className="text-[10px] uppercase tracking-caps text-bone-muted hover:text-bone transition disabled:opacity-30"
        >
          ⏸ Pause
        </button>
        <div className="flex-1 px-4">
          <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[9px] tracking-caps uppercase text-bone-faint mt-1.5 text-center font-medium">
            {currentExIdx + 1} / {exercises.length} Übungen · Satz {currentSet}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAbort}
          disabled={isPending}
          className="text-[10px] uppercase tracking-caps text-bone-muted hover:text-red-400 transition disabled:opacity-30"
        >
          ✕ Ende
        </button>
      </header>

      {/* REST TIMER OVERLAY */}
      {isResting ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <p className="text-[11px] uppercase tracking-caps text-gold font-medium mb-6">
            Pause
          </p>
          <p className="font-serif text-8xl text-bone tabular-nums mb-8">
            {formatTimerMMSS(restSecondsLeft)}
          </p>
          <p className="text-sm text-bone-muted mb-12 text-center">
            Nächster Satz: {currentExercise?.sets} × {formatReps(currentExercise?.reps_min ?? null, currentExercise?.reps_max ?? null)}
          </p>
          <button
            type="button"
            onClick={handleSkipRest}
            className="text-[11px] uppercase tracking-caps font-medium px-6 py-3 border border-bone/30 text-bone hover:bg-white/[0.04] transition"
          >
            ▶ Pause überspringen
          </button>
        </div>
      ) : (
        // EXERCISE CARD
        <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
          {currentExercise ? (
            <>
              <p className="text-[10px] uppercase tracking-caps text-gold font-medium mb-3">
                Übung {currentExIdx + 1}
              </p>
              <h1 className="font-serif text-4xl text-bone leading-tight mb-3">
                {currentExercise.name}
              </h1>
              {currentExercise.notes && (
                <p className="text-sm text-bone-muted italic mb-6">
                  {currentExercise.notes}
                </p>
              )}
              <p className="text-sm text-bone-muted mb-8">
                {currentExercise.sets} Sätze ×{' '}
                {formatReps(currentExercise.reps_min, currentExercise.reps_max)} Reps
                {currentExercise.rest_seconds && (
                  <> · {currentExercise.rest_seconds}s Pause</>
                )}
              </p>

              {/* Set-Counter & Input */}
              <div className="border border-white/[0.08] p-6 mb-6">
                <p className="text-[10px] uppercase tracking-caps text-bone-faint font-medium mb-5">
                  Satz {currentSet} von {currentExercise.sets}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {currentExercise.weight_type !== 'body' && (
                    <div>
                      <label className="text-[10px] uppercase tracking-caps text-bone-faint font-medium block mb-2">
                        Gewicht (kg)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        placeholder="z.B. 70"
                        className="w-full bg-black border border-white/[0.12] px-3 py-3 text-2xl text-bone tabular-nums text-center focus:outline-none focus:border-gold/50"
                      />
                    </div>
                  )}
                  <div className={currentExercise.weight_type === 'body' ? 'col-span-2' : ''}>
                    <label className="text-[10px] uppercase tracking-caps text-bone-faint font-medium block mb-2">
                      Reps
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={repsInput}
                      onChange={(e) => setRepsInput(e.target.value)}
                      placeholder={formatReps(currentExercise.reps_min, currentExercise.reps_max)}
                      className="w-full bg-black border border-white/[0.12] px-3 py-3 text-2xl text-bone tabular-nums text-center focus:outline-none focus:border-gold/50"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSetDone}
                  disabled={isPending}
                  className="w-full text-[12px] uppercase tracking-caps font-medium px-6 py-4 border border-gold text-gold bg-gold/5 hover:bg-gold/15 transition disabled:opacity-30"
                >
                  {isPending ? '...' : '✓ Satz abgeschlossen'}
                </button>
              </div>

              {/* Bisherige Sätze dieser Übung */}
              {currentExLogs.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-caps text-bone-faint font-medium mb-3">
                    Bisher
                  </p>
                  <div className="space-y-1.5">
                    {currentExLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex justify-between items-center text-sm text-bone-muted tabular-nums"
                      >
                        <span>Satz {log.set_number}</span>
                        <span>
                          {log.weight_used_kg != null && `${log.weight_used_kg} kg · `}
                          {log.reps_done != null && `${log.reps_done} Reps`}
                          {log.reps_done == null && log.weight_used_kg == null && '✓'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skip-Exercise */}
              <button
                type="button"
                onClick={handleSkipExercise}
                disabled={isPending}
                className="text-[10px] uppercase tracking-caps text-bone-faint hover:text-bone-muted transition mt-auto disabled:opacity-30"
              >
                → Nächste Übung überspringen
              </button>

              {error && (
                <p className="text-[11px] text-red-400 italic mt-4">{error}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-bone-muted text-center">Keine Übungen vorhanden.</p>
          )}
        </div>
      )}
    </main>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmStyle = 'primary',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmStyle?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-black border border-white/[0.12] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl text-bone leading-tight mb-3">
          {title}
        </h2>
        <p className="text-sm text-bone-muted leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            className={
              confirmStyle === 'danger'
                ? 'w-full text-[12px] uppercase tracking-caps font-medium px-5 py-3 border border-red-400/60 text-red-400 hover:bg-red-400/10 transition'
                : 'w-full text-[12px] uppercase tracking-caps font-medium px-5 py-3 border border-gold text-gold bg-gold/5 hover:bg-gold/15 transition'
            }
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-[11px] uppercase tracking-caps font-medium px-5 py-3 border border-white/15 text-bone-muted hover:text-bone hover:border-white/30 transition"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-bone-muted">{label}</span>
      <span className="text-base text-bone tabular-nums font-medium">{value}</span>
    </div>
  );
}
