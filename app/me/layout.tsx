// Layout für den gesamten Mitglieder-Bereich (/me/*). Hängt die native
// Tab-Leiste unter jede Seite und reserviert unten Platz (inkl. Safe-Area),
// damit kein Inhalt hinter der Leiste verschwindet. Die Login-Seiten (/,
// /login/verify) liegen außerhalb von /me und bekommen die Leiste NICHT.

import BottomNav from "@/components/nav/BottomNav";

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-nav">{children}</div>
      <BottomNav />
    </>
  );
}
