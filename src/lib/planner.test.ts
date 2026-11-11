import { describe, expect, it } from 'vitest';
import {
  SPECIES,
  SPECIES_BY_SLUG,
  TANK_PRESETS,
  compatible,
  decodePlan,
  encodePlan,
  evaluate,
  heaterFor,
  tankGallons,
} from './planner';

const tank = (id: string) => TANK_PRESETS.find((t) => t.id === id)!;
const sp = (slug: string) => SPECIES_BY_SLUG.get(slug)!;

describe('species data', () => {
  it('has unique slugs and sane ranges', () => {
    const slugs = new Set<string>();
    for (const s of SPECIES) {
      expect(slugs.has(s.slug), s.slug).toBe(false);
      slugs.add(s.slug);
      for (const r of [s.tempF, s.ph, s.gh]) expect(r[0], s.slug).toBeLessThanOrEqual(r[1]);
      expect(s.sizeIn).toBeGreaterThan(0);
      expect(s.minGroup).toBeGreaterThanOrEqual(1);
      if (s.flags.includes('predator')) expect(s.eatsFishUnderIn, s.slug).toBeGreaterThan(0);
    }
  });
});

describe('evaluate', () => {
  it('passes a classic peaceful community', () => {
    const r = evaluate(tank('20L'), [
      { slug: 'neon-tetra', qty: 8 },
      { slug: 'panda-corydoras', qty: 6 },
      { slug: 'honey-gourami', qty: 1 },
    ]);
    expect(r.issues.filter((i) => i.severity === 'critical')).toEqual([]);
    expect(r.stockingLabel).toBe('good');
    expect(r.heaterWatts).toBe(100);
  });

  it('flags a predator with small prey', () => {
    const r = evaluate(tank('55'), [
      { slug: 'angelfish', qty: 1 },
      { slug: 'neon-tetra', qty: 10 },
    ]);
    expect(r.issues.some((i) => i.severity === 'critical' && i.message.includes('eat'))).toBe(true);
  });

  it('flags fin nippers with long fins', () => {
    const r = evaluate(tank('29'), [
      { slug: 'tiger-barb', qty: 6 },
      { slug: 'betta', qty: 1 },
    ]);
    expect(r.issues.some((i) => i.message.includes('nips'))).toBe(true);
  });

  it('flags small groups, small tanks and too many bettas', () => {
    const r = evaluate(tank('10'), [
      { slug: 'neon-tetra', qty: 2 },
      { slug: 'oscar', qty: 1 },
      { slug: 'betta', qty: 2 },
    ]);
    const text = r.issues.map((i) => i.message).join('\n');
    expect(text).toContain('group of at least 6');
    expect(text).toContain('75 gallon');
    expect(text).toContain('Keep only 1');
  });

  it('flags goldfish with tropical fish and skips the heater for cold tanks', () => {
    const mixed = evaluate(tank('75'), [
      { slug: 'common-goldfish', qty: 1 },
      { slug: 'discus', qty: 5 },
    ]);
    expect(mixed.water.tempF).toBeNull();
    expect(mixed.issues.some((i) => i.message.includes('cool-water'))).toBe(true);

    const cold = evaluate(tank('40B'), [{ slug: 'fancy-goldfish', qty: 1 }]);
    expect(cold.heaterWatts).toBeNull();
  });

  it('reports overstocking', () => {
    const r = evaluate(tank('10'), [{ slug: 'platy', qty: 10 }]);
    expect(r.stockingLabel).toBe('overstocked');
  });
});

describe('helpers', () => {
  it('computes volume and heater size', () => {
    expect(Math.round(tankGallons({ lengthIn: 30, widthIn: 12, heightIn: 12 }))).toBe(19);
    expect(heaterFor(20)).toBe(100);
    expect(heaterFor(10)).toBe(50);
  });

  it('round-trips share links', () => {
    const stock = [
      { slug: 'neon-tetra', qty: 8 },
      { slug: 'bronze-corydoras', qty: 6 },
    ];
    const back = decodePlan(encodePlan(tank('29'), stock));
    expect(back.tank.id).toBe('29');
    expect(back.stock).toEqual(stock);

    const custom = decodePlan('tank=36x15x20&fish=guppy.5,unknown.3');
    expect(custom.tank.lengthIn).toBe(36);
    expect(custom.stock).toEqual([{ slug: 'guppy', qty: 5 }]);
  });

  it('judges pair compatibility', () => {
    expect(compatible(sp('neon-tetra'), sp('panda-corydoras'))).toBe(true);
    expect(compatible(sp('oscar'), sp('neon-tetra'))).toBe(false);
    expect(compatible(sp('common-goldfish'), sp('discus'))).toBe(false);
  });
});

describe('cool-water and size rules', () => {
  it('keeps goldfish away from tropical tetras but allows white clouds with danios', () => {
    expect(compatible(sp('common-goldfish'), sp('neon-tetra'))).toBe(false);
    expect(compatible(sp('white-cloud-minnow'), sp('zebra-danio'))).toBe(true);
  });
  it('warns when a big fish lives with tiny ones', () => {
    expect(compatible(sp('clown-loach'), sp('ember-tetra'))).toBe(false);
  });
});
