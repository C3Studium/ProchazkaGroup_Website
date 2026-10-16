import { readFileSync, writeFileSync } from "node:fs";

// Natural Earth 110m admin-0, public domain. Projected once, here, and written
// out as plain SVG paths — the map ships as strings, not as a library.
//
//   node scripts/make-europe.mjs [ne.json] [out.js]
//
// The source is ne_110m_admin_0_countries.geojson, from nvkelso/natural-earth-vector.
const SRC = process.argv[2] || "ne.json";
const OUT = process.argv[3] || "src/components/pages/nabidka/OfferStrip/europe.js";
const geo = JSON.parse(readFileSync(SRC, "utf8"));

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

// The whole continent, rather than the sixteen countries we are in. There is no
// hand-written list of context countries any more: whatever land falls inside
// the frame is drawn, which is how Turkey, European Russia and the African
// coast get on it — a Mediterranean with no far shore is a coastline, not a
// sea. They are drawn at the faintest weight the site has, so our own sixteen
// read out of a continent instead of floating on nothing.
// The longitudes are chosen for the composition rather than for the countries:
// the box the section gives the map is bound by its HEIGHT on every screen wider
// than a phone, so what a country measures on screen falls out of the range of
// latitude alone and the frame can be as wide as it looks best being. What it
// looks best being is the width of the screen — the map is the section's ground
// now and it fades out at both sides rather than ending — so this runs the whole
// way, Iceland to the Urals, which is also where Europe is usually said to stop.
const FRAME = { west: -25, east: 58, south: 33.5, north: 71.5 };

// Lambert conformal conic, not Mercator.
//
// The frame used to be fitted to our own sixteen countries and everything north
// of Germany was cut off mid-country. Opening it to the whole continent is the
// easy half; the hard half is that Mercator cannot hold Europe in a landscape
// box. Cape North is at 71°N, where Mercator's vertical scale is four times
// what it is at Crete, and the continent that comes out 1000×700 here comes out
// 1000×1250 there — a portrait map, in a box that is wider than it is tall.
//
// A conic is what an atlas uses for Europe for exactly this reason: the scale
// is true along two parallels instead of one, so the north costs what it
// actually measures. Conformal rather than equal-area because these are
// outlines somebody is meant to recognise, and shape is what makes a country
// recognisable. The standard parallels and the central meridian are the ones an
// atlas uses for this continent rather than ones fitted to this frame: 40°N and
// 56°N, true at the Mediterranean and true again across the Baltic, which is
// where the countries on this map actually are.
const RAD = Math.PI / 180;
const P1 = 40;
const P2 = 56;
const LON0 = 16;
const cot = (lat) => Math.tan(Math.PI / 4 + (lat * RAD) / 2);
const N = Math.log(Math.cos(P1 * RAD) / Math.cos(P2 * RAD)) / Math.log(cot(P2) / cot(P1));
const F = (Math.cos(P1 * RAD) * Math.pow(cot(P1), N)) / N;
// y comes out growing southward, which is the direction svg's grows.
const raw = (lon, lat) => {
  const r = F / Math.pow(cot(lat), N);
  const th = N * (lon - LON0) * RAD;
  return [r * Math.sin(th), r * Math.cos(th)];
};

// The plate, fitted to the frame. A conic lays the parallels out as arcs, so
// the box holding the frame is a little taller than the frame's own corners —
// the top two come out sea, which is what is above Norway anyway.
const W = 1000;
let x0 = Infinity;
let x1 = -Infinity;
let y0 = Infinity;
let y1 = -Infinity;
for (let lat = FRAME.south; lat <= FRAME.north + 1e-9; lat += 0.25) {
  for (let lon = FRAME.west; lon <= FRAME.east + 1e-9; lon += 0.25) {
    const [x, y] = raw(lon, lat);
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}
const K = W / (x1 - x0);
const H = Math.round((y1 - y0) * K);
const project = (lon, lat) => {
  const [x, y] = raw(lon, lat);
  return [(x - x0) * K, (y - y0) * K];
};

// Everything inside the plate, and a strip beyond it. The strip is not slack:
// the svg draws with overflow visible so a country reached for can grow past
// the edge, and neighbours are pushed aside by about this much.
const BLEED = 36;
const RECT = [-BLEED, -BLEED, W + BLEED, H + BLEED];

// Sutherland–Hodgman, against the four edges in turn. Russia, Turkey and North
// Africa run off the sides of this frame, and simply dropping the points that
// land outside — which is what this did when the frame held nothing but our own
// countries — closes the ring straight across the gap and leaves Russia a wedge
// pointing at Moscow.
const EDGES = [
  { in: (p) => p[0] >= RECT[0], cut: (a, b) => [RECT[0], a[1] + ((b[1] - a[1]) * (RECT[0] - a[0])) / (b[0] - a[0])] },
  { in: (p) => p[0] <= RECT[2], cut: (a, b) => [RECT[2], a[1] + ((b[1] - a[1]) * (RECT[2] - a[0])) / (b[0] - a[0])] },
  { in: (p) => p[1] >= RECT[1], cut: (a, b) => [a[0] + ((b[0] - a[0]) * (RECT[1] - a[1])) / (b[1] - a[1]), RECT[1]] },
  { in: (p) => p[1] <= RECT[3], cut: (a, b) => [a[0] + ((b[0] - a[0]) * (RECT[3] - a[1])) / (b[1] - a[1]), RECT[3]] },
];
const clip = (pts) => {
  let out = pts;
  for (const edge of EDGES) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const cur = src[i];
      const prev = src[(i + src.length - 1) % src.length];
      const ci = edge.in(cur);
      const pi = edge.in(prev);
      if (ci) {
        if (!pi) out.push(edge.cut(prev, cur));
        out.push(cur);
      } else if (pi) {
        out.push(edge.cut(prev, cur));
      }
    }
    if (!out.length) return [];
  }
  return out;
};

// Every point kept, and only the ones landing within a pixel of the last one
// dropped. Taking every other point as well — which this did first — turns
// Norway into a triangle: at 110m the outlines are already coarse and there is
// nothing left to spare. The background gets a looser tolerance than our own
// sixteen do, because forty countries of coastline at full weight is most of
// the file.
const thin = (pts, tol) => {
  const out = [];
  let last = null;
  for (const p of pts) {
    if (last && Math.abs(p[0] - last[0]) < tol && Math.abs(p[1] - last[1]) < tol) continue;
    out.push(p);
    last = p;
  }
  return out;
};

const ringsOf = (g) => {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys
    .map((p) => clip(p[0].map(([lon, lat]) => project(lon, lat))))
    .filter((r) => r.length >= 4);
};

const draw = (rings, tol) =>
  rings
    .map((r) => thin(r, tol))
    .filter((r) => r.length >= 4)
    .map((r) => "M" + r.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z")
    .join("");

// Where a flag stands. The centroid of the country's largest piece, not of all
// of them: Greece's islands and Italy's Sicily would drag the mark off the
// mainland and into the sea.
const anchorOf = (rings) => {
  let best = null;
  let bestArea = 0;
  for (const pts of rings) {
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
  const rings = ringsOf(f.geometry);
  if (!rings.length) continue;
  if (OURS[name] !== undefined) {
    const d = draw(rings, 0.9);
    if (!d) continue;
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
    ours.push({ name: CS[name] || name, iso, year: OURS[name], d, at: anchorOf(rings), box });
  } else {
    const d = draw(rings, 1.3);
    if (d) context.push(d);
  }
}
ours.sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.name.localeCompare(b.name, "cs"));

const out = `// Generated once from Natural Earth's 110m admin-0 outlines, which are in the
// public domain, and projected here rather than at runtime: what ships is a
// handful of SVG paths, not a mapping library and not a topojson file.
//
// The years are OVB's own, from the history page on ovb.eu.
//
// Regenerated by scripts/make-europe.mjs if the frame or the country list changes.
export const MAP = { w: ${W}, h: ${H} };

// The rest of the continent, at the faintest weight the site draws: a map with
// only our own countries on it is not a map, it is a diagram. Everything that
// falls inside the frame is here, which is why the far shore of the
// Mediterranean is too.
export const CONTEXT_PATHS = ${JSON.stringify(context)};

// Where we are, in the order we arrived — each with the point its flag stands
// on, in the map's own coordinates.
export const MARKETS = ${JSON.stringify(ours, null, 4)};
`;
writeFileSync(OUT, out);
console.log("ours", ours.length, "context", context.length, "size", (out.length / 1024).toFixed(1) + "kB", "viewBox", W, H, "ratio", (W / H).toFixed(2));
console.log(ours.map((o) => `${o.year ?? "----"} ${o.name} ${o.iso} box ${o.box}`).join("\n"));
