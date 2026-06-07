// Schlankes Gewichts-Liniendiagramm als Inline-SVG — serverseitig gerendert,
// keine Chart-Bibliothek. Skaliert automatisch auf den Wertebereich (inkl. Ziel).

import { getDict, type Locale } from "@/lib/i18n";

export type WeightPoint = { label: string; value: number };

const W = 320;
const H = 130;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 22;

export default function WeightChart({
  points,
  target,
  locale,
}: {
  points: WeightPoint[];
  target?: number | null;
  locale: Locale;
}) {
  const d = getDict(locale).progress;
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (target != null) {
    min = Math.min(min, target);
    max = Math.max(max, target);
  }
  // Etwas Luft im Wertebereich, und Division durch 0 vermeiden.
  if (max - min < 1) {
    min -= 1;
    max += 1;
  } else {
    const padV = (max - min) * 0.12;
    min -= padV;
    max += padV;
  }

  const n = points.length;
  const x = (i: number) =>
    PAD_X + (i / (n - 1)) * (W - 2 * PAD_X);
  const y = (v: number) =>
    PAD_TOP + (1 - (v - min) / (max - min)) * (H - PAD_TOP - PAD_BOTTOM);

  const linePoints = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPoints = `${PAD_X},${H - PAD_BOTTOM} ${linePoints} ${W - PAD_X},${
    H - PAD_BOTTOM
  }`;

  const targetY = target != null ? y(target) : null;

  // Nur erstes, letztes und ggf. mittleres Label zeigen (sonst zu eng).
  const labelIdx = new Set<number>([0, n - 1, Math.floor((n - 1) / 2)]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={d.weightTrend}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FAAC6" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#8FAAC6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ziel-Linie */}
      {targetY != null && (
        <>
          <line
            x1={PAD_X}
            y1={targetY}
            x2={W - PAD_X}
            y2={targetY}
            stroke="#5E6B7A"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={W - PAD_X}
            y={targetY - 4}
            textAnchor="end"
            className="fill-bone-faint"
            style={{ fontSize: "9px", letterSpacing: "0.08em" }}
          >
            {d.target} {target} kg
          </text>
        </>
      )}

      {/* Fläche unter der Linie */}
      <polygon points={areaPoints} fill="url(#weightArea)" />

      {/* Linie */}
      <polyline
        points={linePoints}
        fill="none"
        stroke="#8FAAC6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Punkte */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={i === n - 1 ? 3.5 : 2.5}
          fill={i === n - 1 ? "#8FAAC6" : "#10151D"}
          stroke="#8FAAC6"
          strokeWidth="1.5"
        />
      ))}

      {/* X-Achsen-Labels */}
      {points.map((p, i) =>
        labelIdx.has(i) ? (
          <text
            key={`l-${i}`}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            className="fill-bone-faint"
            style={{ fontSize: "9px" }}
          >
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
