// JS helpers mirroring the SCSS breakpoints (orientation-aware).
// Landscape breakpoints (min-width)
export const bpH = {
  xxs: 400,
  xs: 750,
  sm: 900,
  smt: 900,   // special: height >= 720
  md: 1200,
  mdt: 1300,  // special: height >= 950
  lg: 1400,
  xl: 1500,
  huge: 1730,
  xxl: 1921,
};

/**
 * The root font-size ramp, as a plain number.
 *
 * The site is written in rem and clamp(), and above 1921 across the root font
 * size grows with the screen so the whole design scales to a 2K monitor rather
 * than sitting at its 1920 size in the middle of one. The rule that does it
 * lives in styles/globals.scss:
 *
 *     font-size: clamp(16px, 0.8333vw, 21.5px)
 *
 * This is that rule as a factor — what a rem is at a given width, over what a
 * rem is below the stop. Components that measure the page in real pixels need
 * it, because those pixels are almost always a measurement of something drawn
 * in rem: the height of the site bar, the clearance under it, the size of a
 * card whose type has just grown a third inside it. Left flat, they describe a
 * page that is no longer there.
 *
 * Exactly 1 at 1920 and at every width below it, so nothing that multiplies by
 * this changes on any screen the site was drawn for. It stops where the clamp
 * stops, a little past 2560 — beyond that is a panel nobody has looked at, and
 * holding is more honest than extrapolating.
 *
 * It has to stay in step with globals.scss. There is no way to read a CSS
 * clamp back out as a number, so this is a copy, and it is the only one.
 */
export const rootRamp = (vw) => Math.min(21.5, Math.max(16, vw * 0.008333)) / 16;

// Portrait breakpoints (min-width)
export const bpV = {
  xs: 320,
  sm: 380,
  s: 400,
  md: 600,
  lg: 1000,
};

const orderH = ["xxs", "xs", "sm", "smt", "md", "mdt", "lg", "xl", "huge", "xxl"];
const orderV = ["xs", "sm", "s", "md", "lg"];

const isClient = typeof window !== "undefined";

const hQuery = (key) => {
  const min = bpH[key];
  if (!min) return null;
  if (key === "smt") {
    return `(min-width: ${min}px) and (min-height: 720px) and (orientation: landscape)`;
  }
  if (key === "mdt") {
    return `(min-width: ${min}px) and (min-height: 950px) and (orientation: landscape)`;
  }
  return `(min-width: ${min}px) and (orientation: landscape)`;
};

const vQuery = (key) => {
  const min = bpV[key];
  if (!min) return null;
  return `(min-width: ${min}px) and (orientation: portrait)`;
};

export const mediaQueries = {
  h: isClient
    ? Object.fromEntries(
        orderH.map((k) => [k, window.matchMedia(hQuery(k) ?? "(min-width:0px)")])
      )
    : {},
  v: isClient
    ? Object.fromEntries(
        orderV.map((k) => [k, window.matchMedia(vQuery(k) ?? "(min-width:0px)")])
      )
    : {},
};

export const matchesH = (key) => !!mediaQueries.h[key]?.matches;
export const matchesV = (key) => !!mediaQueries.v[key]?.matches;

// Returns the highest matching landscape breakpoint (or null).
export const currentH = () => {
  let active = null;
  for (const k of orderH) {
    if (matchesH(k)) active = k;
  }
  return active;
};

// Returns the highest matching portrait breakpoint (or null).
export const currentV = () => {
  let active = null;
  for (const k of orderV) {
    if (matchesV(k)) active = k;
  }
  return active;
};

// Helpers for exact match and ranges (inclusive).
const idxH = (key) => orderH.indexOf(key);
const idxV = (key) => orderV.indexOf(key);

export const isH = (key) => currentH() === key;
export const isV = (key) => currentV() === key;

export const inRangeH = (minKey, maxKey) => {
  const bp = currentH();
  const i = idxH(bp);
  return i !== -1 && i >= idxH(minKey) && i <= idxH(maxKey);
};

export const inRangeV = (minKey, maxKey) => {
  const bp = currentV();
  const i = idxV(bp);
  return i !== -1 && i >= idxV(minKey) && i <= idxV(maxKey);
};

// Example usage for Framer Motion (comment out / adapt):
// const bp = currentH();
// const heroAnim = bp === "lg"
//   ? { height: "100vh", transition: { duration: 0.5 } }
//   : { height: "90vh", transition: { duration: 0.3 } };
//
// Disable state outside a range:
// const isMobileH = inRangeH("xxs", "sm"); // true for xxs/xs/sm
// const isTabletV = inRangeV("xs", "s");   // true for xs/sm/s
// NOTE: Usage example
// import { currentH, matchesH } from "@/helpers/checkViewport";

// const bp = currentH();        // e.g., "lg"
// const isLgUp = matchesH("lg"); // true if min-width 1400 & landscape
