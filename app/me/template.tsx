// Seitenübergang für den Mitglieder-Bereich. Eine `template.tsx` wird – anders
// als ein Layout – bei JEDEM Navigationswechsel neu gemountet. Dadurch läuft die
// CSS-Einblend-Animation (`.page-transition` in globals.css) bei jedem Tab-Wechsel
// automatisch erneut. Die Tab-Leiste im Layout bleibt dabei stehen.

export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-transition">{children}</div>;
}
