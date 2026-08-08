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
};

// Portrait breakpoints (min-width)
export const bpV = {
  xs: 320,
  sm: 380,
  s: 400,
  md: 600,
  lg: 1000,
};

const orderH = ["xxs", "xs", "sm", "smt", "md", "mdt", "lg", "xl", "huge"];
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
