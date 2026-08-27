/**
 * The stats seam.
 *
 * `StatsPanel` renders from a *source*, never from a provider's API shape. A
 * source is a plain object:
 *
 *   {
 *     id:           "clarity",
 *     title:        "Microsoft Clarity",
 *     description:  shown under the heading
 *     dashboardUrl: deep link to the provider's own UI, or null
 *     ranges:       [{ id, title, days }]        selectable periods
 *     load({ days }) => {
 *       tiles:      [{ id, label, value, unit?, delta?, hint? }]
 *       breakdowns: [{ id, title, note?, rows: [{ label, value, share? }] }]
 *       note?:      caveat rendered under the panel
 *     }
 *   }
 *
 * Everything the panel draws — the tile row, the breakdown tables, the range
 * picker, the loading and error states — is driven by that return value. So
 * dropping a real provider in is: write `load()`, register the source. No layout
 * changes, which is the whole point of building the placeholder against a
 * contract rather than hard-coding boxes.
 *
 * `value` is pre-formatted by the source (a string) or a number the panel
 * formats in Czech locale. `delta` is a signed number meaning percent change
 * against the previous period of the same length; omit it when the provider
 * cannot supply a comparison rather than sending zero.
 */

const sources = new Map()

export function registerStatsSource(source) {
  if (!source?.id || typeof source.load !== "function") {
    throw new Error("[studio] A stats source needs an `id` and a `load()`.")
  }
  sources.set(source.id, source)
  return source
}

export const listStatsSources = () => [...sources.values()]
export const getStatsSource = (id) => sources.get(id) || null

export const DEFAULT_RANGES = [
  { id: "1", title: "24 hodin", days: 1 },
  { id: "7", title: "7 dní", days: 7 },
  { id: "30", title: "30 dní", days: 30 },
]
