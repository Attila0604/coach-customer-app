import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import WorkoutPlayer from '@/components/workout/WorkoutPlayer';

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

  return <WorkoutPlayer session={session as any} />;
}
