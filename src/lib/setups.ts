import setupData from '../data/setups.json';
import { TANK_PRESETS, encodePlan, type Stock, type Tank } from './planner';

export interface Setup {
  slug: string;
  name: string;
  tank: string;
  blurb: string;
  fish: [string, number][];
}

export const SETUPS: Setup[] = setupData as Setup[];

export function setupTank(s: Setup): Tank {
  return TANK_PRESETS.find((t) => t.id === s.tank)!;
}

export function setupStock(s: Setup): Stock[] {
  return s.fish.map(([slug, qty]) => ({ slug, qty }));
}

export function setupLink(s: Setup): string {
  return `/?${encodePlan(setupTank(s), setupStock(s))}`;
}
