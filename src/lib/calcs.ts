export const CUBIC_IN_PER_GAL = 231;
export const L_PER_GAL = 3.785;
export const CM_PER_IN = 2.54;

/** Rectangular tank volume in US gallons. */
export function rectGallons(lengthIn: number, widthIn: number, heightIn: number): number {
  return (lengthIn * widthIn * heightIn) / CUBIC_IN_PER_GAL;
}

/**
 * Bowfront tank volume in US gallons. `sideDepthIn` is the front-to-back depth at the ends,
 * `bowIn` the extra depth at the centre of the bow. The bow is treated as a parabolic segment.
 */
export function bowfrontGallons(lengthIn: number, sideDepthIn: number, bowIn: number, heightIn: number): number {
  const area = lengthIn * sideDepthIn + (2 / 3) * lengthIn * bowIn;
  return (area * heightIn) / CUBIC_IN_PER_GAL;
}

/** Cylinder tank volume in US gallons. */
export function cylinderGallons(diameterIn: number, heightIn: number): number {
  const r = diameterIn / 2;
  return (Math.PI * r * r * heightIn) / CUBIC_IN_PER_GAL;
}

/** Water actually in a set-up tank: below the rim, minus substrate and decor. Roughly 85%. */
export const FILLED_FRACTION = 0.85;

/** Percent of water to change to bring nitrate from `current` down to `target` ppm in one change. */
export function changePercentForNitrate(current: number, target: number): number {
  if (current <= 0 || target >= current) return 0;
  return Math.ceil((1 - target / current) * 100);
}

/** Dose for a volume, given a label dose of `labelAmount` per `labelVolume` (same volume unit). */
export function dose(volume: number, labelAmount: number, labelVolume: number): number {
  if (labelVolume <= 0) return 0;
  return (volume * labelAmount) / labelVolume;
}

/** Pounds of sand or gravel for a footprint and depth in inches (about 100 lb per cubic foot). */
export function substratePounds(lengthIn: number, widthIn: number, depthIn: number, lbPerCubicFt = 100): number {
  return ((lengthIn * widthIn * depthIn) / 1728) * lbPerCubicFt;
}

/** Substrate volume in liters, for products sold by the bag volume. */
export function substrateLiters(lengthIn: number, widthIn: number, depthIn: number): number {
  return (lengthIn * widthIn * depthIn * 16.387) / 1000;
}
