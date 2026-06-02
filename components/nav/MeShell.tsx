"use client";

// Steuert die "Chrome" im Mitglieder-Bereich: untere Tab-Leiste + der dafür
// reservierte Abstand. Auf der Workout-Session-Seite läuft der Player im
// Vollbild — dort wird beides ausgeblendet. Überall sonst: Tab-Leiste wie immer.

import { usePathname } from "next/navigation";
import BottomNav from "@/components/nav/BottomNav";

export default function MeShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const immersive = pathname.startsWith("/me/training/session/");

  return (
    <>
      <div className={immersive ? undefined : "pb-nav"}>{children}</div>
      {!immersive && <BottomNav />}
    </>
  );
}
