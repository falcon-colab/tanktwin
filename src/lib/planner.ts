import speciesData from '../data/species.json';

export type Temperament = 'peaceful' | 'semi-aggressive' | 'aggressive';
export type Level = 'top' | 'middle' | 'bottom' | 'all';
export type Flag =
  | 'fin-nipper'
  | 'long-fins'
  | 'predator'
  | 'territorial'
  | 'same-species-aggression'
  | 'coldwater'
  | 'livebearer'
  | 'jumper';

export interface Species {
  slug: string;
  name: string;
  scientific: string;
  sizeIn: number;
  minTankGal: number;
  minGroup: number;
  maxPerTank?: number;
  tempF: [number, number];
  ph: [number, number];
  gh: [number, number];
  temperament: Temperament;
  level: Level;
  bioload: number;
  care: 'easy' | 'moderate' | 'hard';
  flags: Flag[];
  eatsFishUnderIn?: number;
  notes: string;
}

export const SPECIES: Species[] = speciesData as Species[];
export const SPECIES_BY_SLUG = new Map(SPECIES.map((s) => [s.slug, s]));

export interface Tank {
  id: string;
  label: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

/** Common US tank sizes with their usual outside dimensions in inches. */
export const TANK_PRESETS: Tank[] = [
  { id: '5', label: '5 gallon', lengthIn: 16, widthIn: 8, heightIn: 10 },
  { id: '10', label: '10 gallon', lengthIn: 20, widthIn: 10, heightIn: 12 },
  { id: '20H', label: '20 gallon high', lengthIn: 24, widthIn: 12, heightIn: 16 },
  { id: '20L', label: '20 gallon long', lengthIn: 30, widthIn: 12, heightIn: 12 },
  { id: '29', label: '29 gallon', lengthIn: 30, widthIn: 12, heightIn: 18 },
  { id: '40B', label: '40 gallon breeder', lengthIn: 36, widthIn: 18, heightIn: 16 },
  { id: '55', label: '55 gallon', lengthIn: 48, widthIn: 13, heightIn: 21 },
  { id: '75', label: '75 gallon', lengthIn: 48, widthIn: 18, heightIn: 21 },
  { id: '125', label: '125 gallon', lengthIn: 72, widthIn: 18, heightIn: 22 },
];

const CUBIC_IN_PER_GAL = 231;
export const LITERS_PER_GAL = 3.785;

/** Volume of a rectangular tank, in US gallons. */
export function tankGallons(t: Pick<Tank, 'lengthIn' | 'widthIn' | 'heightIn'>): number {
  return (t.lengthIn * t.widthIn * t.heightIn) / CUBIC_IN_PER_GAL;
}

/** Presets are sold by nominal size, so use that instead of the computed volume. */
export function nominalGallons(t: Tank): number {
  const n = parseInt(t.id, 10);
  return Number.isFinite(n) && TANK_PRESETS.some((p) => p.id === t.id) ? n : Math.round(tankGallons(t));
}

export interface Stock {
  slug: string;
  qty: number;
}

export type Severity = 'critical' | 'warning' | 'info';

export interface Issue {
  severity: Severity;
  message: string;
  slugs: string[];
}

export interface WaterRange {
  tempF: [number, number] | null;
  ph: [number, number] | null;
  gh: [number, number] | null;
}

export interface PlanResult {
  gallons: number;
  stockingPct: number;
  stockingLabel: 'empty' | 'light' | 'good' | 'full' | 'overstocked';
  issues: Issue[];
  water: WaterRange;
  filterGph: [number, number];
  heaterWatts: number | null;
  totalFish: number;
}

function intersect(ranges: [number, number][]): [number, number] | null {
  if (ranges.length === 0) return null;
  const lo = Math.max(...ranges.map((r) => r[0]));
  const hi = Math.min(...ranges.map((r) => r[1]));
  return lo <= hi ? [lo, hi] : null;
}

function overlaps(a: [number, number], b: [number, number]): boolean {
  return Math.max(a[0], b[0]) <= Math.min(a[1], b[1]);
}

const CAPACITY_PER_GAL = 3.2;

const HEATER_SIZES = [25, 50, 75, 100, 150, 200, 300];

export function heaterFor(gallons: number): number {
  const target = gallons * 4;
  return HEATER_SIZES.find((w) => w >= target) ?? Math.ceil(target / 100) * 100;
}

/**
 * Stocking load as a percentage of a guideline capacity.
 * Waste grows faster than length, so each fish counts as
 * (adult length in inches)^1.5 x its bioload factor. Capacity is
 * 3.2 units per gallon, calibrated so common accepted setups land
 * between "good" and "full" (e.g. one oscar in 75 gal, 8 neons +
 * 6 corys + a gourami in a 20 long).
 */
export function stockingPercent(stock: Stock[], gallons: number): number {
  if (gallons <= 0) return 0;
  let load = 0;
  for (const { slug, qty } of stock) {
    const s = SPECIES_BY_SLUG.get(slug);
    if (s) load += qty * Math.pow(s.sizeIn, 1.5) * s.bioload;
  }
  return Math.round((load / (gallons * CAPACITY_PER_GAL)) * 100);
}

function stockingLabel(pct: number, total: number): PlanResult['stockingLabel'] {
  if (total === 0) return 'empty';
  if (pct < 50) return 'light';
  if (pct <= 85) return 'good';
  if (pct <= 100) return 'full';
  return 'overstocked';
}

/** Problems between two different species, regardless of order. */
export function pairIssues(a: Species, b: Species): Issue[] {
  const out: Issue[] = [];
  for (const [x, y] of [
    [a, b],
    [b, a],
  ] as const) {
    if (x.flags.includes('predator') && x.eatsFishUnderIn && y.sizeIn <= x.eatsFishUnderIn) {
      out.push({
        severity: 'critical',
        message: `${x.name} will likely eat ${y.name} (adults reach only ${y.sizeIn} in).`,
        slugs: [x.slug, y.slug],
      });
    }
    if (x.flags.includes('fin-nipper') && y.flags.includes('long-fins')) {
      out.push({
        severity: 'warning',
        message: `${x.name} often nips the long fins of ${y.name}.`,
        slugs: [x.slug, y.slug],
      });
    }
    if (x.temperament === 'aggressive' && y.temperament === 'peaceful') {
      out.push({
        severity: 'critical',
        message: `${x.name} is aggressive and will bully peaceful ${y.name}.`,
        slugs: [x.slug, y.slug],
      });
    }
  }
  if (
    a.flags.includes('territorial') &&
    b.flags.includes('territorial') &&
    a.level === 'bottom' &&
    b.level === 'bottom'
  ) {
    out.push({
      severity: 'warning',
      message: `${a.name} and ${b.name} both claim territory on the bottom. Give them plenty of caves and space.`,
      slugs: [a.slug, b.slug],
    });
  }
  const coldA = a.flags.includes('coldwater');
  const coldB = b.flags.includes('coldwater');
  if (coldA !== coldB) {
    const cold = coldA ? a : b;
    const warm = coldA ? b : a;
    const noOverlap = !overlaps(a.tempF, b.tempF);
    if (noOverlap || warm.tempF[0] > 68) {
      out.push({
        severity: noOverlap ? 'critical' : 'warning',
        message: `${cold.name} is a cool-water fish and ${warm.name} prefers tropical temperatures.`,
        slugs: [cold.slug, warm.slug],
      });
    }
  }
  for (const [big, small] of [
    [a, b],
    [b, a],
  ] as const) {
    const alreadyPredator = big.flags.includes('predator') && big.eatsFishUnderIn && small.sizeIn <= big.eatsFishUnderIn;
    if (!alreadyPredator && big.sizeIn >= 6 && small.sizeIn <= 1) {
      out.push({
        severity: 'warning',
        message: `${big.name} grows large enough to swallow tiny ${small.name}.`,
        slugs: [big.slug, small.slug],
      });
    }
  }
  return out;
}

/** True when two species have no critical or warning problems and share a water range. */
export function compatible(a: Species, b: Species): boolean {
  if (a.slug === b.slug) return true;
  return (
    pairIssues(a, b).every((i) => i.severity === 'info') &&
    overlaps(a.tempF, b.tempF) &&
    overlaps(a.ph, b.ph) &&
    overlaps(a.gh, b.gh)
  );
}

export function evaluate(tank: Tank, stock: Stock[]): PlanResult {
  const gallons = nominalGallons(tank);
  const items = stock
    .filter((s) => s.qty > 0)
    .map((s) => ({ ...s, sp: SPECIES_BY_SLUG.get(s.slug) }))
    .filter((s): s is Stock & { sp: Species } => Boolean(s.sp));

  const issues: Issue[] = [];
  const totalFish = items.reduce((n, i) => n + i.qty, 0);

  for (const { sp, qty } of items) {
    if (gallons < sp.minTankGal) {
      issues.push({
        severity: 'critical',
        message: `${sp.name} needs at least a ${sp.minTankGal} gallon tank.`,
        slugs: [sp.slug],
      });
    }
    if (qty < sp.minGroup) {
      issues.push({
        severity: 'warning',
        message: `${sp.name} should be kept in a group of at least ${sp.minGroup}. You have ${qty}.`,
        slugs: [sp.slug],
      });
    }
    if (sp.maxPerTank && qty > sp.maxPerTank) {
      issues.push({
        severity: 'critical',
        message: `Keep only ${sp.maxPerTank} ${sp.name} per tank. They fight each other.`,
        slugs: [sp.slug],
      });
    } else if (sp.flags.includes('same-species-aggression') && qty > 1 && !sp.maxPerTank) {
      issues.push({
        severity: 'warning',
        message: `Males of ${sp.name} fight each other. Keep one male, or a male with females.`,
        slugs: [sp.slug],
      });
    }
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      issues.push(...pairIssues(items[i].sp, items[j].sp));
    }
  }

  const water: WaterRange = {
    tempF: intersect(items.map((i) => i.sp.tempF)),
    ph: intersect(items.map((i) => i.sp.ph)),
    gh: intersect(items.map((i) => i.sp.gh)),
  };
  if (items.length > 1) {
    const labels: [keyof WaterRange, string][] = [
      ['tempF', 'temperature'],
      ['ph', 'pH'],
      ['gh', 'water hardness'],
    ];
    for (const [key, label] of labels) {
      if (water[key]) continue;
      const clash = findClash(items.map((i) => i.sp), key);
      issues.push({
        severity: 'critical',
        message: clash
          ? `${clash[0].name} and ${clash[1].name} need different ${label} ranges. No setting suits every fish.`
          : `No single ${label} suits every fish in this plan.`,
        slugs: clash ? [clash[0].slug, clash[1].slug] : [],
      });
    }
  }

  const pct = stockingPercent(items, gallons);
  if (pct > 100) {
    issues.push({
      severity: 'critical',
      message: `The tank is overstocked at ${pct}% of the guideline. Choose a bigger tank or fewer fish.`,
      slugs: [],
    });
  }

  const allCold = items.length > 0 && items.every((i) => i.sp.flags.includes('coldwater'));
  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    gallons,
    stockingPct: pct,
    stockingLabel: stockingLabel(pct, totalFish),
    issues: dedupe(issues),
    water,
    filterGph: [Math.round(gallons * 4), Math.round(gallons * 6)],
    heaterWatts: allCold ? null : heaterFor(gallons),
    totalFish,
  };
}

function findClash(list: Species[], key: keyof WaterRange): [Species, Species] | null {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (!overlaps(list[i][key], list[j][key])) return [list[i], list[j]];
    }
  }
  return null;
}

function dedupe(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((i) => (seen.has(i.message) ? false : (seen.add(i.message), true)));
}

/** Encode a plan for the share link: tank id or custom dims, then slug.qty pairs. */
export function encodePlan(tank: Tank, stock: Stock[]): string {
  const p = new URLSearchParams();
  p.set('tank', TANK_PRESETS.some((t) => t.id === tank.id) ? tank.id : `${tank.lengthIn}x${tank.widthIn}x${tank.heightIn}`);
  const fish = stock.filter((s) => s.qty > 0).map((s) => `${s.slug}.${s.qty}`).join(',');
  if (fish) p.set('fish', fish);
  return p.toString();
}

export function decodePlan(query: string): { tank: Tank; stock: Stock[] } {
  const p = new URLSearchParams(query);
  const tankParam = p.get('tank') ?? '20L';
  let tank = TANK_PRESETS.find((t) => t.id === tankParam);
  if (!tank) {
    const m = tankParam.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
    tank = m
      ? { id: 'custom', label: 'Custom', lengthIn: +m[1], widthIn: +m[2], heightIn: +m[3] }
      : TANK_PRESETS[3];
  }
  const stock: Stock[] = [];
  for (const part of (p.get('fish') ?? '').split(',')) {
    const m = part.match(/^([a-z0-9-]+)\.(\d{1,3})$/);
    if (m && SPECIES_BY_SLUG.has(m[1])) stock.push({ slug: m[1], qty: Math.min(+m[2], 200) });
  }
  return { tank, stock };
}
