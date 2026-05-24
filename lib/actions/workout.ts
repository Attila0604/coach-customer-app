'use server';

// ============================================================================
// Server Actions: Workout-Sessions + Logs (Customer-App)
// Phase H — Workout-Logging Backend
// ============================================================================

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

const SESSION_COOKIE = 'coach_customer_id';

// PRIVATE Result-Types (nicht exportieren in 'use server' files!)
type StartResult =
  | { ok: true; sessionId: string; resumed: boolean }
  | { ok: false; error: string };

type LogResult =
  | { ok: true; logId: string }
  | { ok: false; error: string };

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

type CompleteResult =
  | {
      ok: true;
      stats: {
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
    }
  | { ok: false; error: string };

type GetActiveResult =
  | { ok: true; session: any | null }
  | { ok: false; error: string };

type GetRecentResult =
  | { ok: true; sessions: any[] }
  | { ok: false; error: string };

// Helper: customer-id aus Cookie holen
async function getCustomerId(): Promise<string | null> {
  const cookieStore = cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  return id || null;
}

// ============================================================================
// START / RESUME
// ============================================================================

export async function startWorkoutSession(dayId: string): Promise<StartResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!dayId) return { ok: false, error: 'Tag-ID fehlt.' };

  const supabase = createAdminClient();

  // Validate day + plan ownership
  const { data: day, error: dayErr } = await supabase
    .from('training_days')
    .select('id, plan_id, training_plans!inner(id, customer_id, status)')
    .eq('id', dayId)
    .maybeSingle();
  if (dayErr || !day) return { ok: false, error: 'Trainingstag nicht gefunden.' };

  const plan: any = Array.isArray(day.training_plans)
    ? day.training_plans[0]
    : day.training_plans;
  if (!plan || plan.customer_id !== customerId) {
    return { ok: false, error: 'Keine Berechtigung.' };
  }
  if (plan.status !== 'active') {
    return { ok: false, error: 'Plan ist nicht aktiv.' };
  }

  // Existing active/paused session?
  const { data: existing } = await supabase
    .from('workout_sessions')
    .select('id, day_id, status')
    .eq('customer_id', customerId)
    .in('status', ['in_progress', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Same day → resume (set to in_progress if paused)
    if (existing.day_id === dayId) {
      if (existing.status === 'paused') {
        await supabase
          .from('workout_sessions')
          .update({ status: 'in_progress' })
          .eq('id', existing.id);
      }
      return { ok: true, sessionId: existing.id, resumed: true };
    }
    // Different day → abort old
    await supabase
      .from('workout_sessions')
      .update({
        status: 'aborted',
        ended_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  }

  // Create new
  const { data: session, error: insertErr } = await supabase
    .from('workout_sessions')
    .insert({
      customer_id: customerId,
      plan_id: plan.id,
      day_id: dayId,
      status: 'in_progress',
    })
    .select()
    .single();

  if (insertErr || !session) {
    return { ok: false, error: insertErr?.message || 'Session-Insert fehlgeschlagen.' };
  }

  revalidatePath('/me/training');
  return { ok: true, sessionId: session.id, resumed: false };
}

// ============================================================================
// LOG SET
// ============================================================================

export async function logSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  repsDone: number | null,
  weightKg: number | null,
  notes?: string
): Promise<LogResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!sessionId || !exerciseId) return { ok: false, error: 'Fehlende IDs.' };
  if (setNumber < 1) return { ok: false, error: 'Ungültige Satz-Nummer.' };

  const supabase = createAdminClient();

  // Validate session ownership + status
  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, customer_id, status, day_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return { ok: false, error: 'Session nicht gefunden.' };
  if (session.customer_id !== customerId) return { ok: false, error: 'Keine Berechtigung.' };
  if (session.status !== 'in_progress') {
    return { ok: false, error: 'Session ist nicht aktiv.' };
  }

  // Validate exercise gehört zur day der session
  const { data: exercise } = await supabase
    .from('exercises')
    .select('id, day_id')
    .eq('id', exerciseId)
    .maybeSingle();

  if (!exercise) return { ok: false, error: 'Übung nicht gefunden.' };
  if (exercise.day_id !== session.day_id) {
    return { ok: false, error: 'Übung gehört nicht zu diesem Workout.' };
  }

  const { data: log, error: insertErr } = await supabase
    .from('workout_logs')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: setNumber,
      reps_done: repsDone,
      weight_used_kg: weightKg,
      notes: notes || null,
    })
    .select()
    .single();

  if (insertErr || !log) {
    return { ok: false, error: insertErr?.message || 'Log-Insert fehlgeschlagen.' };
  }

  return { ok: true, logId: log.id };
}

export async function deleteSetLog(logId: string): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!logId) return { ok: false, error: 'Log-ID fehlt.' };

  const supabase = createAdminClient();

  const { data: log } = await supabase
    .from('workout_logs')
    .select('id, workout_sessions!inner(customer_id)')
    .eq('id', logId)
    .maybeSingle();

  if (!log) return { ok: false, error: 'Log nicht gefunden.' };
  const sess: any = Array.isArray(log.workout_sessions)
    ? log.workout_sessions[0]
    : log.workout_sessions;
  if (!sess || sess.customer_id !== customerId) {
    return { ok: false, error: 'Keine Berechtigung.' };
  }

  const { error } = await supabase.from('workout_logs').delete().eq('id', logId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================================================
// COMPLETE WORKOUT + Stats + PR-Detection
// ============================================================================

export async function completeWorkoutSession(
  sessionId: string
): Promise<CompleteResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!sessionId) return { ok: false, error: 'Session-ID fehlt.' };

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, customer_id, started_at, day_id, status')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return { ok: false, error: 'Session nicht gefunden.' };
  if (session.customer_id !== customerId) return { ok: false, error: 'Keine Berechtigung.' };
  if (session.status === 'completed') {
    return { ok: false, error: 'Session bereits abgeschlossen.' };
  }

  const startedAt = new Date(session.started_at);
  const endedAt = new Date();
  const durationSeconds = Math.max(
    1,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
  );

  // Logs laden
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('id, exercise_id, set_number, reps_done, weight_used_kg, exercises(name)')
    .eq('session_id', sessionId);

  const validLogs = (logs || []) as any[];
  const totalSets = validLogs.length;

  const totalVolume = validLogs.reduce((sum, log) => {
    const w = Number(log.weight_used_kg) || 0;
    const r = Number(log.reps_done) || 0;
    return sum + w * r;
  }, 0);

  const exerciseIds = Array.from(new Set(validLogs.map(l => l.exercise_id))) as string[];
  const exercisesCompleted = exerciseIds.length;

  // Personal Records prüfen (nur für Übungen mit weight_used_kg > 0)
  const personalRecords: Array<{
    exercise: string;
    previousMax: number | null;
    newMax: number;
  }> = [];

  for (const exId of exerciseIds) {
    const thisSessionLogs = validLogs.filter(l => l.exercise_id === exId);
    const weights = thisSessionLogs
      .map(l => Number(l.weight_used_kg) || 0)
      .filter(w => w > 0);
    if (weights.length === 0) continue;
    const thisMax = Math.max(...weights);

    // Vorherige completed sessions
    const { data: prevLogs } = await supabase
      .from('workout_logs')
      .select('weight_used_kg, workout_sessions!inner(status)')
      .eq('exercise_id', exId)
      .neq('session_id', sessionId)
      .not('weight_used_kg', 'is', null);

    const prevCompleted = (prevLogs || []).filter((p: any) => {
      const ws = Array.isArray(p.workout_sessions)
        ? p.workout_sessions[0]
        : p.workout_sessions;
      return ws?.status === 'completed';
    });

    const previousMax =
      prevCompleted.length > 0
        ? Math.max(...prevCompleted.map((p: any) => Number(p.weight_used_kg) || 0))
        : null;

    if (previousMax === null || thisMax > previousMax) {
      const exName = thisSessionLogs[0]?.exercises?.name || 'Übung';
      personalRecords.push({
        exercise: exName,
        previousMax,
        newMax: thisMax,
      });
    }
  }

  const { error: updateErr } = await supabase
    .from('workout_sessions')
    .update({
      status: 'completed',
      ended_at: endedAt.toISOString(),
      total_duration_seconds: durationSeconds,
    })
    .eq('id', sessionId);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath('/me/training');
  revalidatePath('/me');

  return {
    ok: true,
    stats: {
      durationSeconds,
      totalSets,
      totalVolume: Math.round(totalVolume * 10) / 10,
      exercisesCompleted,
      personalRecords,
    },
  };
}

// ============================================================================
// ABORT / PAUSE / RESUME
// ============================================================================

export async function abortWorkoutSession(sessionId: string): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!sessionId) return { ok: false, error: 'Session-ID fehlt.' };

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, customer_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return { ok: false, error: 'Session nicht gefunden.' };
  if (session.customer_id !== customerId) return { ok: false, error: 'Keine Berechtigung.' };

  const { error } = await supabase
    .from('workout_sessions')
    .update({
      status: 'aborted',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/me/training');
  return { ok: true };
}

export async function pauseWorkoutSession(sessionId: string): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!sessionId) return { ok: false, error: 'Session-ID fehlt.' };

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, customer_id, status')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return { ok: false, error: 'Session nicht gefunden.' };
  if (session.customer_id !== customerId) return { ok: false, error: 'Keine Berechtigung.' };
  if (session.status !== 'in_progress') {
    return { ok: false, error: 'Session ist nicht aktiv.' };
  }

  const { error } = await supabase
    .from('workout_sessions')
    .update({ status: 'paused' })
    .eq('id', sessionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/me/training');
  return { ok: true };
}

export async function resumeWorkoutSession(sessionId: string): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!sessionId) return { ok: false, error: 'Session-ID fehlt.' };

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, customer_id, status')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return { ok: false, error: 'Session nicht gefunden.' };
  if (session.customer_id !== customerId) return { ok: false, error: 'Keine Berechtigung.' };
  if (session.status !== 'paused') {
    return { ok: false, error: 'Session ist nicht pausiert.' };
  }

  const { error } = await supabase
    .from('workout_sessions')
    .update({ status: 'in_progress' })
    .eq('id', sessionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/me/training');
  return { ok: true };
}

// ============================================================================
// QUERIES (für Player + /me Dashboard + History)
// ============================================================================

export async function getActiveSession(): Promise<GetActiveResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      `
      *,
      training_days(
        id,
        title,
        subtitle,
        day_number,
        exercises(*)
      ),
      workout_logs(*)
    `
    )
    .eq('customer_id', customerId)
    .in('status', ['in_progress', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data };
}

export async function getRecentWorkoutSessions(
  limit: number = 5
): Promise<GetRecentResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      `
      id,
      status,
      started_at,
      ended_at,
      total_duration_seconds,
      training_days(title, subtitle, day_number)
    `
    )
    .eq('customer_id', customerId)
    .in('status', ['completed', 'aborted'])
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message };
  return { ok: true, sessions: data || [] };
}
