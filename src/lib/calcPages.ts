import type { CalcKind } from '../components/Calculator';

export interface CalcPage {
  slug: string;
  kind: CalcKind;
  name: string;
  title: string;
  description: string;
  intro: string;
}

export const CALC_PAGES: CalcPage[] = [
  {
    slug: 'aquarium-volume',
    kind: 'volume',
    name: 'Tank volume',
    title: 'Aquarium Volume Calculator: Gallons and Liters for Any Tank Shape | TankTwin',
    description: 'Work out how many gallons or liters your aquarium holds, for rectangle, bowfront and cylinder tanks, plus the real water volume once it is set up.',
    intro: 'Measure your tank and get its volume in gallons and liters, plus how much water it really holds once it is set up.',
  },
  {
    slug: 'water-change',
    kind: 'water-change',
    name: 'Water change',
    title: 'Aquarium Water Change Calculator: How Much Water to Change | TankTwin',
    description: 'Find how many gallons to remove for a water change, and what percentage you need to change to bring nitrate down to a safe level.',
    intro: 'Find how much water to remove, or how big a change you need to bring nitrate down.',
  },
  {
    slug: 'water-conditioner-dose',
    kind: 'conditioner',
    name: 'Water conditioner dose',
    title: 'Water Conditioner Dosage Calculator for Aquarium Water Changes | TankTwin',
    description: 'Scale the dose on your dechlorinator or water conditioner label to the exact amount of new water you are adding.',
    intro: 'Enter the dose from your conditioner label and how much new water you are adding. We scale it for you.',
  },
  {
    slug: 'medication-dose',
    kind: 'medication',
    name: 'Medication dose',
    title: 'Aquarium Medication Dosage Calculator | TankTwin',
    description: 'Scale a fish medicine dose from the label to the real amount of water in your aquarium, so you do not overdose or underdose.',
    intro: 'Scale the label dose of a fish medicine to the water actually in your tank.',
  },
  {
    slug: 'substrate',
    kind: 'substrate',
    name: 'Substrate amount',
    title: 'Aquarium Sand and Gravel Calculator: How Much Substrate Do I Need? | TankTwin',
    description: 'Calculate how many pounds of sand or gravel, or liters of aquasoil, you need for your tank size and the depth you want.',
    intro: 'Find how much sand, gravel or aquasoil to buy for your tank and the depth you want.',
  },
];
