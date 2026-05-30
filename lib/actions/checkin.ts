'use server';

// ============================================================================
// Server Action: Wöchentlicher Check-in (Customer-App)
// Schreibt in die geteilte `checkins`-Tabelle (unique(customer_id, week_of)).
// week_of = Montag der aktuellen Wien-Woche.
// ============================================================================

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { viennaMondayKey } from '@/lib/date';

const SESSION_COOKIE = 'coach_customer_id';

export type CheckinInput = {
  weight_kg: number | null;
  waist_cm: number | null;
  mood_rating: number | null;
  energy_rating: number | null;
  sleep_rating: number | null;
  notes: string | null;
};

type Result = { ok: true } | { ok: false; error: string };

function clampRating(v: number | null): number | null {
  if (v == null) return null;
  if (!Number.isFinite(v)) return null;
  return Math.max(1, Math.min(10, Math.round(v)));
}

function cleanNumber(v: number | null, max: number): number | null {
  if (v == null) return null;
  if (!Number.isFinite(v) || v < 0 || v > max) return null;
  return v;
}

export async function saveCheckin(input: CheckinInput): Promise<Result> {
  const customerId = cookies().get(SESSION_COOKIE)?.value;
  if (!customerId) return { ok: false, error: 'Nicht angemeldet.' };

  const row = {
    customer_id: customerId,
    week_of: viennaMondayKey(new Date()),
    weight_kg: cleanNumber(input.weight_kg, 500),
    waist_cm: cleanNumber(input.waist_cm, 300),
    mood_rating: clampRating(input.mood_rating),
    energy_rating: clampRating(input.energy_rating),
    sleep_rating: clampRating(input.sleep_rating),
    notes: input.notes && input.notes.trim() ? input.notes.trim().slice(0, 1000) : null,
  };

  const hasAnyValue =
    row.weight_kg != null ||
    row.waist_cm != null ||
    row.mood_rating != null ||
    row.energy_rating != null ||
    row.sleep_rating != null ||
    row.notes != null;

  if (!hasAnyValue) {
    return { ok: false, error: 'Bitte mindestens ein Feld ausfüllen.' };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('checkins')
    .upsert(row, { onConflict: 'customer_id,week_of' });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/me');
  revalidatePath('/me/checkin');
  return { ok: true };
}
