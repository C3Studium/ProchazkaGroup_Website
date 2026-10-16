/**
 * The Studio's icon set.
 *
 * Contract 1 lets a schema declare `icon: "star"` — "a key into the Studio's
 * icon set" — so this map is that set, and an unknown key degrades to a neutral
 * mark rather than a gap in the navigation.
 *
 * Drawn by hand rather than pulled from @remixicon/react (which the project has)
 * because that set is solid-filled at these sizes and the admin is built out of
 * hairlines. One consistent 1.3px stroke matters more here than breadth.
 */

const P = (d, key) => <path key={key} d={d} />
const C = (cx, cy, r, key) => <circle key={key} cx={cx} cy={cy} r={r} />
const D = (cx, cy, key) => <circle key={key} cx={cx} cy={cy} r="1.05" fill="currentColor" stroke="none" />

const ICONS = {
  star: () => P("M12 3.6l2.6 5.35 5.9.86-4.27 4.16 1.01 5.87L12 17.03l-5.24 2.77 1-5.87L3.5 9.81l5.9-.86z"),
  user: () => [C(12, 8.2, 3.6, "a"), P("M4.8 20c1-3.6 3.8-5.5 7.2-5.5s6.2 1.9 7.2 5.5", "b")],
  users: () => [C(9.6, 8.4, 3.2, "a"), P("M3 20c.9-3.3 3.4-5 6.6-5s5.7 1.7 6.6 5", "b"), P("M16.4 5.6a3.1 3.1 0 0 1 0 5.9", "c"), P("M17.6 15.3c2 .6 3.4 2.1 3.9 4.7", "d")],
  layers: () => [P("M12 3.2l8.4 4.5-8.4 4.5-8.4-4.5z", "a"), P("M3.6 12.3L12 16.8l8.4-4.5", "b"), P("M3.6 16.5L12 21l8.4-4.5", "c")],
  tag: () => [P("M11.6 3.4H20.5v8.9l-8.7 8.7-8.9-8.9z", "a"), D(16.2, 7.8, "b")],
  help: () => [C(12, 12, 8.6, "a"), P("M9.5 9.6a2.6 2.6 0 1 1 3.1 2.5v1.7", "b"), D(12.5, 16.9, "c")],
  document: () => [P("M6.2 3.2h7.6l5.2 5.2V20.8H6.2z", "a"), P("M13.8 3.2v5.2H19", "b"), P("M9 13h6M9 16.4h4", "c")],
  image: () => [P("M3.6 4.8h16.8v14.4H3.6z", "a"), C(9, 10, 1.7, "b"), P("M4 17.2l4.7-4.4 4.8 4.6 2.6-2.4 4.3 4", "c")],
  chart: () => [P("M4 4v16h16", "a"), P("M7.5 15.5l3.6-4.4 3.2 2.7 4.4-6", "b")],
  search: () => [C(11, 11, 6.4, "a"), P("M15.8 15.8L20.5 20.5", "b")],
  plus: () => P("M12 5.2v13.6M5.2 12h13.6"),
  check: () => P("M4.8 12.4l4.9 4.9L19.4 7.2"),
  close: () => P("M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"),
  chevronDown: () => P("M6.2 9.4L12 15.2l5.8-5.8"),
  chevronLeft: () => P("M14.6 5.8L8.4 12l6.2 6.2"),
  chevronRight: () => P("M9.4 5.8L15.6 12l-6.2 6.2"),
  chevronUp: () => P("M6.2 14.6L12 8.8l5.8 5.8"),
  trash: () => [P("M4.4 6.6h15.2", "a"), P("M9.2 6.6V3.8h5.6v2.8", "b"), P("M6.4 6.6l.9 13.6h9.4l.9-13.6", "c"), P("M10.2 10.4v6M13.8 10.4v6", "d")],
  upload: () => [P("M12 15.8V3.9", "a"), P("M7.4 8.5L12 3.9l4.6 4.6", "b"), P("M4.4 15v4a1.2 1.2 0 0 0 1.2 1.2h12.8A1.2 1.2 0 0 0 19.6 19v-4", "c")],
  external: () => [P("M14 3.8h6.4v6.4", "a"), P("M20.4 3.8l-8.6 8.6", "b"), P("M17.6 14v5.4a1 1 0 0 1-1 1H4.6a1 1 0 0 1-1-1V7.4a1 1 0 0 1 1-1H10", "c")],
  eye: () => [P("M2.6 12S6.4 5.6 12 5.6 21.4 12 21.4 12 17.6 18.4 12 18.4 2.6 12 2.6 12z", "a"), C(12, 12, 2.9, "b")],
  eyeOff: () => [P("M9.4 6.1A9.6 9.6 0 0 1 12 5.6c5.6 0 9.4 6.4 9.4 6.4a17 17 0 0 1-3 3.7", "a"), P("M6.2 8.1A17.6 17.6 0 0 0 2.6 12S6.4 18.4 12 18.4a9.4 9.4 0 0 0 3.4-.6", "b"), P("M4.4 4.4l15.2 15.2", "c")],
  logout: () => [P("M9.4 4.2H5.2a1.2 1.2 0 0 0-1.2 1.2v13.2a1.2 1.2 0 0 0 1.2 1.2h4.2", "a"), P("M15.4 8.2l3.8 3.8-3.8 3.8", "b"), P("M19.2 12H9", "c")],
  warning: () => [P("M12 3.6l9 16.2H3z", "a"), P("M12 10v4.6", "b"), D(12, 17.3, "c")],
  info: () => [C(12, 12, 8.6, "a"), P("M12 11.2v5.4", "b"), D(12, 8.2, "c")],
  clock: () => [C(12, 12, 8.6, "a"), P("M12 7.2V12l3.2 2.1", "b")],
  refresh: () => [P("M20 11.4a8.2 8.2 0 1 0-.7 4.6", "a"), P("M20.6 5.6v5.8h-5.8", "b")],
  mail: () => [P("M3.4 5.6h17.2v12.8H3.4z", "a"), P("M3.9 7l8.1 6.2L20.1 7", "b")],
  lock: () => [P("M5.2 10.6h13.6v9.2H5.2z", "a"), P("M8.6 10.6V8a3.4 3.4 0 1 1 6.8 0v2.6", "b")],
  folder: () => P("M3.6 6.2h5.9l2 2.7h8.9v10.9H3.6z"),
  filter: () => P("M4.6 6.6h14.8M7.6 12h8.8M10.4 17.4h3.2"),
  sort: () => [P("M7 4.6v14.8M3.6 16l3.4 3.4L10.4 16", "a"), P("M17 19.4V4.6M13.6 8L17 4.6 20.4 8", "b")],
  inbox: () => [P("M3.6 13.6h4.9l1.5 2.6h4l1.5-2.6h4.9", "a"), P("M3.6 13.6L6.2 4.6h11.6l2.6 9v6.8H3.6z", "b")],
  grid: () => P("M4 4h6.4v6.4H4zM13.6 4H20v6.4h-6.4zM4 13.6h6.4V20H4zM13.6 13.6H20V20h-6.4z"),
  list: () => [P("M8.6 6.6h11M8.6 12h11M8.6 17.4h11", "a"), D(4.6, 6.6, "b"), D(4.6, 12, "c"), D(4.6, 17.4, "d")],
  drag: () => [D(9.4, 6.4, "a"), D(14.6, 6.4, "b"), D(9.4, 12, "c"), D(14.6, 12, "d"), D(9.4, 17.6, "e"), D(14.6, 17.6, "f")],
  more: () => [D(5.6, 12, "a"), D(12, 12, "b"), D(18.4, 12, "c")],
  link: () => [P("M10.2 13.8a3.6 3.6 0 0 0 5.1 0l3.1-3.1a3.6 3.6 0 0 0-5.1-5.1L11.8 7", "a"), P("M13.8 10.2a3.6 3.6 0 0 0-5.1 0l-3.1 3.1a3.6 3.6 0 0 0 5.1 5.1L12.2 17", "b")],
  calendar: () => [P("M3.8 6.4h16.4v13.4H3.8z", "a"), P("M3.8 10.4h16.4", "b"), P("M8.2 3.8v3.4M15.8 3.8v3.4", "c")],
  settings: () => [C(12, 12, 2.9, "a"), P("M12 3.4l1.4 2.3 2.7-.4.6 2.6 2.4 1.3-1.2 2.4 1.2 2.4-2.4 1.3-.6 2.6-2.7-.4L12 20.6l-1.4-2.3-2.7.4-.6-2.6-2.4-1.3 1.2-2.4-1.2-2.4 2.4-1.3.6-2.6 2.7.4z", "b")],
  arrowLeft: () => [P("M19.4 12H4.6", "a"), P("M10.4 5.8L4.2 12l6.2 6.2", "b")],
  // A lidded box: the same silhouette as `folder` would have made "archive" and
  // "media" read alike in the row actions, where they sit a few pixels apart.
  archive: () => [P("M3.6 4.4h16.8v3.8H3.6z", "a"), P("M5.2 8.2v11.4h13.6V8.2", "b"), P("M9.8 12h4.4", "c")],
  // Archive plus the return arrow from `refresh`, so the pair reads as one
  // action and its undo rather than as two unrelated icons.
  unarchive: () => [P("M3.6 4.4h16.8v3.8H3.6z", "a"), P("M5.2 8.2v11.4h13.6V8.2", "b"), P("M12 17.2v-5.4", "c"), P("M9.4 14.4L12 11.8l2.6 2.6", "d")],
  dot: () => C(12, 12, 4.4),

  // The preview's device bar. Drawn as three silhouettes that differ in
  // proportion rather than in detail, because that is the only thing they are
  // being asked to say — a phone with a speaker grille and a home button would
  // be more drawing and no more information at 16px.
  monitor: () => [P("M3.4 5h17.2v10.4H3.4z", "a"), P("M9.4 19h5.2", "b"), P("M12 15.4V19", "c")],
  tablet: () => [P("M5.6 3.6h12.8v16.8H5.6z", "a"), P("M10.6 17.8h2.8", "b")],
  phone: () => [P("M7.4 3.4h9.2v17.2H7.4z", "a"), P("M10.8 6.2h2.4", "b")],

  // Rotate: a screen and the arc that turns it. The arc opens at the top right
  // so it cannot be read as `refresh`, which is a full circle and sits three
  // controls away in the same bar.
  rotate: () => [
    P("M4.4 9.6h10v10h-10z", "a"),
    P("M9.4 6.2a7.4 7.4 0 0 1 7.4 7.4", "b"),
    P("M6.4 7l3-.8.8 3", "c"),
  ],

  // Zoom, as the two halves of one control. A magnifier would be a third
  // metaphor in a bar that already has a percentage in it.
  zoomIn: () => [C(10.8, 10.8, 6.2, "a"), P("M15.4 15.4L20.4 20.4", "b"), P("M8.2 10.8h5.2M10.8 8.2v5.2", "c")],
  zoomOut: () => [C(10.8, 10.8, 6.2, "a"), P("M15.4 15.4L20.4 20.4", "b"), P("M8.2 10.8h5.2", "c")],

  // Fit to space: corners pulling outward from a centre.
  fit: () => [
    P("M4 9V4h5", "a"),
    P("M15 4h5v5", "b"),
    P("M20 15v5h-5", "c"),
    P("M9 20H4v-5", "d"),
  ],
}

export function Icon({ name, size = 16, className, strokeWidth = 1.3, ...rest }) {
  const draw = ICONS[name] || ICONS.dot

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {draw()}
    </svg>
  )
}

export const hasIcon = (name) => Boolean(ICONS[name])
export default Icon
