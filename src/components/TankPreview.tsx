import { SPECIES_BY_SLUG, type Stock, type Tank } from '../lib/planner';

const PALETTE = ['#e4572e', '#2e86ab', '#f3a712', '#7b2cbf', '#29bf12', '#ff6392', '#00a6a6', '#c17817', '#5c6bc0', '#d1495b'];
const MAX_PER_SPECIES = 12;
const W = 640;

/** Small deterministic random generator so the drawing is stable between renders. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

const BANDS = { top: [0.08, 0.32], middle: [0.3, 0.62], bottom: [0.68, 0.86], all: [0.1, 0.85] } as const;

interface Props {
  tank: Tank;
  stock: Stock[];
}

/** Side view of the tank with every fish drawn at its adult length, to scale with the tank. */
export default function TankPreview({ tank, stock }: Props) {
  const H = Math.round(W * Math.min(0.75, Math.max(0.3, tank.heightIn / tank.lengthIn)));
  const pxPerIn = W / tank.lengthIn;
  const sandH = Math.max(10, H * 0.08);
  const waterTop = 14;

  const fish: { key: string; x: number; y: number; len: number; color: string; flip: boolean; title: string }[] = [];
  stock.forEach(({ slug, qty }) => {
    const s = SPECIES_BY_SLUG.get(slug);
    if (!s || qty <= 0) return;
    const color = PALETTE[hash(slug) % PALETTE.length];
    const rand = rng(hash(slug) + qty);
    const len = Math.max(6, s.sizeIn * pxPerIn);
    const [lo, hi] = BANDS[s.level];
    const n = Math.min(qty, MAX_PER_SPECIES);
    for (let i = 0; i < n; i++) {
      const x = 8 + rand() * Math.max(1, W - len - 16);
      const yMin = waterTop + (H - waterTop - sandH) * lo;
      const yMax = waterTop + (H - waterTop - sandH) * hi;
      const y = Math.min(H - sandH - len * 0.25, yMin + rand() * Math.max(1, yMax - yMin));
      fish.push({ key: `${slug}-${i}`, x, y, len, color, flip: rand() > 0.5, title: s.name });
    }
  });

  const hidden = stock.some((s) => s.qty > MAX_PER_SPECIES);

  return (
    <figure className="tank-preview">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Side view of your tank with fish drawn at adult size">
        <defs>
          <linearGradient id="tt-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--water-top)" />
            <stop offset="1" stopColor="var(--water-bottom)" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="6" fill="url(#tt-water)" stroke="var(--border)" strokeWidth="2" />
        <line x1="2" x2={W - 2} y1={waterTop} y2={waterTop} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
        <rect x="2" y={H - sandH} width={W - 4} height={sandH - 2} fill="#d9c08f" />
        {fish.map((f) => (
          <g key={f.key} transform={`translate(${f.x} ${f.y}) scale(${f.flip ? -1 : 1} 1) translate(${f.flip ? -f.len : 0} 0)`}>
            <title>{f.title}</title>
            <path
              d={`M0 0 C ${f.len * 0.25} ${-f.len * 0.28}, ${f.len * 0.62} ${-f.len * 0.28}, ${f.len * 0.8} 0 C ${f.len * 0.62} ${f.len * 0.28}, ${f.len * 0.25} ${f.len * 0.28}, 0 0 Z M${f.len * 0.78} 0 L ${f.len} ${-f.len * 0.2} L ${f.len} ${f.len * 0.2} Z`}
              fill={f.color}
              stroke="#000"
              strokeOpacity="0.25"
              strokeWidth="1"
            />
            <circle cx={f.len * 0.16} cy={-f.len * 0.04} r={Math.max(0.8, f.len * 0.04)} fill="#10232b" />
          </g>
        ))}
      </svg>
      <figcaption>
        Drawn to scale at adult size. {hidden ? `Showing up to ${MAX_PER_SPECIES} of each species.` : ''}
      </figcaption>
    </figure>
  );
}
