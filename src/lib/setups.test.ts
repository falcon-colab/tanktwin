import { describe, expect, it } from 'vitest';
import { evaluate, SPECIES_BY_SLUG } from './planner';
import { SETUPS, setupStock, setupTank } from './setups';

describe('ready-made setups', () => {
  for (const s of SETUPS) {
    it(`${s.name} is a valid, problem-free plan`, () => {
      expect(setupTank(s), 'tank preset').toBeTruthy();
      for (const [slug] of s.fish) expect(SPECIES_BY_SLUG.has(slug), slug).toBe(true);
      const r = evaluate(setupTank(s), setupStock(s));
      expect(r.issues.filter((i) => i.severity !== 'info').map((i) => i.message)).toEqual([]);
      expect(['light', 'good', 'full']).toContain(r.stockingLabel);
    });
  }
});
