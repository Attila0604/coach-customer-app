import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import WorkoutPlayer from '@/components/workout/WorkoutPlayer';
import { getLocale } from '@/lib/i18n/server';

const SESSION_COOKIE = 'coach_customer_id';

export default async function WorkoutSessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const customerId = cookies().get(SESSION_COOKIE)?.value;
  if (!customerId) redirect('/');

  const admin = createAdminClient();

  const { data: session, error } = await admin
    .from('workout_sessions')
    .select(
      `
      id,
      customer_id,
      status,
      started_at,
      day_id,
      training_days(
        id,
        title,
        subtitle,
        day_number,
        plan_id,
        training_plans(translations),
        exercises(*)
      ),
      workout_logs(*)
    `
    )
    .eq('id', params.sessionId)
    .maybeSingle();

  if (error || !session) {
    redirect('/me/training');
  }
  if (session.customer_id !== customerId) {
    redirect('/me/training');
  }
  if (session.status === 'completed' || session.status === 'aborted') {
    // Bereits beendet → zurück zur Übersicht
    redirect('/me/training');
  }

  const locale = await getLocale();

  // Übersetzung des Kunden über das deutsche Original legen (Fallback: Deutsch).
  if (locale !== 'de') {
    const day: any = (session as any).training_days;
    const tr: any = day?.training_plans?.translations?.[locale];
    if (day && tr) {
      day.title = tr.days?.[day.id]?.title ?? day.title;
      day.subtitle = tr.days?.[day.id]?.subtitle ?? day.subtitle;
      if (Array.isArray(day.exercises)) {
        day.exercises = day.exercises.map((ex: any) => ({
          ...ex,
          name: tr.exercises?.[ex.id]?.name ?? ex.name,
          notes: tr.exercises?.[ex.id]?.notes ?? ex.notes,
        }));
      }
    }
  }

  return <WorkoutPlayer session={session as any} locale={locale} />;
}
