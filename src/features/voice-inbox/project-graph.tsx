import { projectColor } from "@/features/projects/colors";
import type { VoiceInboxItem } from "./types";

/**
 * The Graph night header art, drawn from real data: one cluster per project.
 * Each capture waiting for review is a bright dot; filed ones are dim.
 * Seeded, so the server and the browser draw the same picture.
 */
export function ProjectGraph({
  pending,
  filed,
}: {
  pending: VoiceInboxItem[];
  filed: VoiceInboxItem[];
}) {
  const counts = new Map<string, { pending: number; filed: number }>();
  for (const i of pending) {
    const c = counts.get(i.projectBucket) ?? { pending: 0, filed: 0 };
    c.pending++;
    counts.set(i.projectBucket, c);
  }
  for (const i of filed) {
    const c = counts.get(i.projectBucket) ?? { pending: 0, filed: 0 };
    c.filed++;
    counts.set(i.projectBucket, c);
  }
  const clusters = Array.from(counts.entries())
    .sort((a, b) => b[1].pending + b[1].filed - (a[1].pending + a[1].filed))
    .slice(0, 6);

  const rand = makeRandom(11);

  // Hubs sit on a loose ring; the biggest project goes in the middle.
  const cx = 280;
  const cy = 200;
  const hubs = clusters.map(([name, c], i) => {
    const angle = i === 0 ? 0 : ((i - 1) / Math.max(clusters.length - 1, 1)) * Math.PI * 2 - 0.6;
    const r = i === 0 ? 0 : 120;
    return { name, c, x: round(cx + Math.cos(angle) * r), y: round(cy + Math.sin(angle) * r * 0.8) };
  });

  const dust = Array.from({ length: 160 }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 200;
    return { x: round(cx + Math.cos(a) * d), y: round(cy + Math.sin(a) * d * 0.85) };
  });

  return (
    <svg
      viewBox="0 0 560 420"
      aria-hidden
      className="pointer-events-none absolute -right-6 top-14 hidden w-[500px] md:block"
    >
      {dust.map((p, i) => (
        <circle key={`d${i}`} cx={p.x} cy={p.y} r={1.1} fill="#33363d" />
      ))}
      {hubs.slice(1).map((h) => (
        <line key={`e${h.name}`} x1={cx} y1={cy} x2={h.x} y2={h.y} stroke="#25272c" strokeWidth={1} />
      ))}
      {hubs.map((h) => {
        const color = projectColor(h.name);
        const sats = [
          ...Array.from({ length: Math.min(h.c.pending, 14) }, () => true),
          ...Array.from({ length: Math.min(h.c.filed, 10) }, () => false),
        ].map((lit) => {
          const a = rand() * Math.PI * 2;
          const d = 18 + rand() * (lit ? 38 : 52);
          return { lit, x: round(h.x + Math.cos(a) * d), y: round(h.y + Math.sin(a) * d) };
        });
        return (
          <g key={h.name}>
            {sats.map((s, i) => (
              <g key={i}>
                <line x1={h.x} y1={h.y} x2={s.x} y2={s.y} stroke="#2c2f36" strokeWidth={1} />
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={s.lit ? 2.8 : 1.8}
                  fill={s.lit ? color : "#4a4d55"}
                  opacity={s.lit ? 0.9 : 0.8}
                />
              </g>
            ))}
            <circle cx={h.x} cy={h.y} r={16} fill={color} opacity={0.12} />
            <circle cx={h.x} cy={h.y} r={6.5} fill={color} />
            <text
              x={h.x}
              y={h.y + 30}
              textAnchor="middle"
              fontSize={11}
              fill="#868a93"
              style={{ fontFamily: "var(--font-system-sans)" }}
            >
              {h.name || "untagged"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Small seeded random number source, so every render draws the same graph. */
function makeRandom(start: number) {
  const state = { seed: start };
  return () => {
    state.seed = (state.seed * 9301 + 49297) % 233280;
    return state.seed / 233280;
  };
}

/** Whole tenths, so server and browser maths print the same numbers. */
function round(n: number) {
  return Math.round(n * 10) / 10;
}
