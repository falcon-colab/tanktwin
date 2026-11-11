import { describe, expect, it } from 'vitest';
import {
  bowfrontGallons,
  changePercentForNitrate,
  cylinderGallons,
  dose,
  rectGallons,
  substrateLiters,
  substratePounds,
} from './calcs';

describe('calculators', () => {
  it('computes tank volumes', () => {
    expect(rectGallons(48, 13, 21)).toBeCloseTo(56.7, 1);
    expect(bowfrontGallons(36, 12, 3, 20)).toBeGreaterThan(rectGallons(36, 12, 20));
    expect(bowfrontGallons(36, 12, 0, 20)).toBeCloseTo(rectGallons(36, 12, 20), 5);
    expect(cylinderGallons(12, 24)).toBeCloseTo(11.75, 1);
  });

  it('computes water change for nitrate', () => {
    expect(changePercentForNitrate(40, 20)).toBe(50);
    expect(changePercentForNitrate(80, 20)).toBe(75);
    expect(changePercentForNitrate(10, 20)).toBe(0);
  });

  it('scales a label dose', () => {
    expect(dose(20, 5, 50)).toBe(2);
    expect(dose(20, 5, 0)).toBe(0);
  });

  it('estimates substrate', () => {
    // A 20 long with 2 inches of sand is about 40 lb (the usual 1 lb per gallon per inch rule).
    expect(Math.round(substratePounds(30, 12, 2))).toBe(42);
    expect(substrateLiters(30, 12, 2)).toBeCloseTo(11.8, 1);
  });
});
