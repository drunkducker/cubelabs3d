/*
 * Lightweight, dependency-free dashboard charts.
 *
 * Design decision: rather than pull in Tremor/Recharts (light-themed, heavy,
 * and in tension with this app's dark custom-token design system — see the
 * Constitution note on not adding conflicting visual frameworks), these are
 * hand-built inline-SVG charts that read the existing CSS tokens. They are
 * server-safe (no client hooks), accessible (role="img" + aria-label), and
 * respect the dark theme. Swap for Tremor later if a full theme reconcile is
 * accepted.
 */

const BLUE = "var(--blue)";

export function Sparkline({ data, label, height = 40 }: { data: number[]; label: string; height?: number }) {
  const w = 120;
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const span = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / span) * height}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label={label} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function BarChart({ data, label, height = 140 }: { data: { label: string; value: number }[]; label: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure role="img" aria-label={label} className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-[var(--muted)]">{d.value.toLocaleString()}</span>
            <div
              className="w-full rounded-t-md"
              style={{ height: `${(d.value / max) * (height - 28)}px`, background: "linear-gradient(180deg,var(--blue),rgba(46,166,255,.35))", minHeight: 3 }}
            />
            <span className="w-full truncate text-center text-[10px] text-[var(--faint)]">{d.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function Donut({ value, total, label, size = 96 }: { value: number; total: number; label: string; size?: number }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-2)" strokeWidth="8" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={BLUE}
        strokeWidth="8"
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-[var(--text)]" style={{ fontWeight: 900, fontSize: 18 }}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
