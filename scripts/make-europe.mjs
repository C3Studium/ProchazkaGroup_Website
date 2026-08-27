import { readFileSync, writeFileSync } from "node:fs";

// Natural Earth 110m admin-0, public domain. Projected once, here, and written
// out as plain SVG paths — the map ships as strings, not as a library.
const geo = JSON.parse(readFileSync("ne.json", "utf8"));

// Where OVB is, and since when. From ovb.eu's own history page.
const OURS = {
  Germany: 1970, Austria: 1991, Poland: 1992, Czechia: 1992, Hungary: 1992,
  Slovakia: 1993, Greece: 1993, Switzerland: 1995, Croatia: 1998,
  Italy: 2002, Romania: 2002, France: 2003, Ukraine: 2007, Belgium: 2018,
  // Markets OVB names but whose year its own history page does not: shown
  // without one rather than with a guess.
  Slovenia: null, Spain: null,
};
const ISO_FIX = { France: "FR", Norway: "NO" };

// Natural Earth names its countries in English; this page is in Czech.
const CS = {
  Germany: "Německo", Austria: "Rakousko", Poland: "Polsko", Czechia: "Česko",
  Hungary: "Maďarsko", Slovakia: "Slovensko", Greece: "Řecko",
  Switzerland: "Švýcarsko", Croatia: "Chorvatsko", Italy: "Itálie",
  Romania: "Rumunsko", France: "Francie", Ukraine: "Ukrajina",
  Belgium: "Belgie", Slovenia: "Slovinsko", Spain: "Španělsko",
};
const CONTEXT = new Set([
  "United Kingdom", "Ireland", "Netherlands", "Denmark", "Sweden", "Norway",
  "Finland", "Portugal", "Serbia", "Bosnia and Herz.", "Bulgaria", "Albania",
  "North Macedonia", "Montenegro", "Kosovo", "Estonia", "Latvia", "Lithuania",
  "Belarus", "Moldova", "Luxembourg", "Turkey", "Denmark", "Iceland",
]);

// A Mercator, fitted to the countries we are in rather than to Europe. The old
// box ran to the North Cape and left the map a tall square with half of it
// empty sea; this one is the smallest rectangle that still holds Spain in the
// west, Ukraine in the east, Greece in the south and Germany in the north. It
// comes out half as wide again as it is tall, which is the shape a section
// under a heading actually has.
const BOX = { west: -10.5, east: 40.5, south: 34.5, north: 55.5 };
const W = 1000;
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const y0 = merc(BOX.north);
const y1 = merc(BOX.south);
const kx = W / (BOX.east - BOX.west);
// Conformal, so the vertical scale is the horizontal one in radians: kx is
// pixels per degree of longitude, and merc() is in radians.
const H = Math.round((y0 - y1) * kx * (180 / Math.PI));
const px = (lon) => (lon - BOX.west) * kx;
const py = (lat) => ((y0 - merc(lat)) / (y0 - y1)) * H;

// Every point kept, and only the ones that land within a pixel of the last one
// dropped. Taking every other point as well — which this did first — turns
// Norway into a triangle: at 110m the outlines are already coarse and there is
// nothing left to spare.
const ring = (coords) => {
  const out = [];
  let last = null;
  coords.forEach((c) => {
    const x = px(c[0]);
    const y = py(c[1]);
    if (x < -80 || x > W + 80 || y < -80 || y > H + 80) return;
    if (last && Math.abs(x - last[0]) < 0.9 && Math.abs(y - last[1]) < 0.9) return;
    out.push([x, y]);
    last = [x, y];
  });
  if (out.length < 4) return "";
  return "M" + out.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
};

const pathOf = (g) => {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys.map((p) => ring(p[0])).filter(Boolean).join("");
};

// Where a flag stands. The centroid of the country's largest piece, not of all
// of them: Greece's islands and Italy's Sicily would drag the mark off the
// mainland and into the sea.
const anchorOf = (g) => {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  let best = null;
  let bestArea = 0;
  for (const poly of polys) {
    const pts = poly[0].map((c) => [px(c[0]), py(c[1])]);
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
      a += f;
      cx += (pts[j][0] + pts[i][0]) * f;
      cy += (pts[j][1] + pts[i][1]) * f;
    }
    a *= 0.5;
    if (Math.abs(a) > bestArea && a !== 0) {
      bestArea = Math.abs(a);
      best = [cx / (6 * a), cy / (6 * a)];
    }
  }
  return best ? [Math.round(best[0]), Math.round(best[1])] : null;
};

const ours = [];
const context = [];
for (const f of geo.features) {
  const name = f.properties.NAME;
  const d = pathOf(f.geometry);
  if (!d) continue;
  if (OURS[name] !== undefined) {
    // Natural Earth files France as -99; the rest are right.
    const iso = f.properties.ISO_A2 === "-99" ? ISO_FIX[name] : f.properties.ISO_A2;
    // Its own box, in map units. A country has to grow enough to hold its own
    // date, and how much that is depends on how big it already is.
    const nums = d.match(/-?[\d.]+/g).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const box = [
      Math.round(Math.max(...xs) - Math.min(...xs)),
      Math.round(Math.max(...ys) - Math.min(...ys)),
    ];
    ours.push({ name: CS[name] || name, iso, year: OURS[name], d, at: anchorOf(f.geometry), box });
  } else if (CONTEXT.has(name)) {
    context.push(d);
  }
}
ours.sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.name.localeCompare(b.name, "cs"));

const out = `// Generated once from Natural Earth's 110m admin-0 outlines, which are in the
// public domain, and projected here rather than at runtime: what ships is a
// handful of SVG paths, not a mapping library and not a topojson file.
//
// The years are OVB's own, from the history page on ovb.eu.
//
// Regenerated by scripts/make-europe.mjs if the box or the country list changes.
export const MAP = { w: ${W}, h: ${H} };

// Everything else in the frame, at the faintest weight the site draws: a map
// with only our own countries on it is not a map, it is a diagram.
export const CONTEXT_PATHS = ${JSON.stringify(context)};

// Where we are, in the order we arrived — each with the point its flag stands
// on, in the map's own coordinates.
export const MARKETS = ${JSON.stringify(ours, null, 4)};
`;
writeFileSync("europe.js", out);
console.log("ours", ours.length, "context", context.length, "size", (out.length / 1024).toFixed(1) + "kB", "viewBox", W, H);
console.log(ours.map((o) => `${o.year} ${o.name} ${o.iso}`).join("\n"));
