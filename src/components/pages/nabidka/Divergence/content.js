// Twenty years of the same money, told twice. Illustrative figures until the
// real model arrives — the board says so on its face.
export const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i * 2);

export const CURVES = {
    // What a hundred today is worth later if it is left alone. Drawn in both
    // halves, because it is the one thing neither future changes — it is the
    // floor both stories are told against.
    inflace: [100, 94, 88, 83, 78, 73, 69, 65, 61, 58, 54],
    // A savings account: keeping pace and no more.
    bez: [100, 99, 98, 97, 95, 94, 92, 91, 89, 88, 86],
    // The same money, to a plan.
    s: [100, 110, 121, 133, 146, 161, 177, 195, 214, 236, 259],
};

// The board's own coordinates. Everything below is drawn in these and stretched
// to whatever the box turns out to be; the strokes are told not to stretch with
// it, so a hairline stays a hairline at any width.
export const VIEW = { w: 1000, h: 440 };

// The board's own vertical range.
export const FLOOR = 30;
export const CEIL = 285;

const x = (i, n) => (i / (n - 1)) * VIEW.w;
const y = (v) => VIEW.h - ((v - FLOOR) / (CEIL - FLOOR)) * VIEW.h;

/** A series as a line. */
export const lineOf = (series) =>
    series.map((v, i) => `${i ? "L" : "M"}${x(i, series.length).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

/** The same series, closed down to the floor, for the wash underneath it. */
export const areaOf = (series) =>
    `${lineOf(series)} L${VIEW.w},${VIEW.h} L0,${VIEW.h} Z`;

/** Where the grid rules sit, in board coordinates. */
export const RULES = [50, 100, 150, 200, 250].map((v) => ({ v, y: y(v) }));

// The two conversions everything on the board needs: what a series reads
// between its samples, and where a value sits up the plot.

/** A series read at any point across the plot, not only at its samples. */
export const readAt = (series, t) => {
    const u = Math.max(0, Math.min(1, t)) * (series.length - 1);
    const i = Math.min(series.length - 2, Math.floor(u));
    const f = u - i;
    return series[i] + (series[i + 1] - series[i]) * f;
};

/** How far up the plot a value sits, 0 at the top and 1 at the foot. */
export const upAt = (v) => 1 - (v - FLOOR) / (CEIL - FLOOR);

/** The year at any point across the plot. */
export const yearAt = (t) => {
    const first = YEARS[0];
    const last = YEARS[YEARS.length - 1];
    return Math.round(first + (last - first) * Math.max(0, Math.min(1, t)));
};
