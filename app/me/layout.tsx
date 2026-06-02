// Layout für den gesamten Mitglieder-Bereich (/me/*). Die "Chrome" (Tab-Leiste
// + unterer Abstand) steuert MeShell — u.a. damit die Workout-Session im
// Vollbild ohne Tab-Leiste läuft. Login-Seiten liegen außerhalb von /me.

import MeShell from "@/components/nav/MeShell";

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MeShell>{children}</MeShell>;
}
