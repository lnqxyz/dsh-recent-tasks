/**
 * Host half of the recent-tasks bundle.
 *
 * Every surface this plugin contributes lives in the browser: the sidebar
 * entry and the page are Client slots. The Host half therefore only has to
 * exist so the bundle patch can insert the plugin into the Host composition,
 * plus carry the one row Settings offers.
 *
 * `keepDays` is volatile on purpose: the settings form can change it while the
 * page is open, and the Loader hands the live value to `apply` without
 * restarting the plugin. A value that is not a whole number is read as the
 * default rather than rejected, because a rejected config would fail the row
 * at boot and take the plugin down over a typo.
 */

/** How many days of history stay on screen; older sessions the sweep button archives. */
const DEFAULT_KEEP_DAYS = 7
/** Bounds of the row: one day is the smallest window that still leaves something to see. */
const MIN_KEEP_DAYS = 1
const MAX_KEEP_DAYS = 365

/** The one editable row: the window, its bounds and the label Settings prints. */
const KEEP_DAYS_SPEC = {
  type: 'number',
  meta: {
    default: DEFAULT_KEEP_DAYS,
    min: MIN_KEEP_DAYS,
    max: MAX_KEEP_DAYS,
    volatile: true,
    description: '只留几天：比这更早的会话会被「归档更早的会话」收进归档', // ui-copy-ignore
  },
}

/** The schema shape the settings form reads back; `refs` is indexed by uid. */
const SCHEMA = {
  uid: 4, // ui-copy-ignore
  refs: {
    3: KEEP_DAYS_SPEC,
    4: { type: 'object', meta: { default: {} }, dict: { keepDays: 3 } }, // ui-copy-ignore
  },
}

/** A detached copy of one plain node, so a caller that rewrites what it reads cannot touch ours. */
function clone(node) {
  if (node === null || typeof node !== 'object') return node
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, clone(value)]))
}

/**
 * Wrap one plain node so it can stand wherever the settings service expects a
 * Schema. The service walks `dict` children itself and calls `toJSON` on each
 * of them, so every nested node needs its own serializer — only the root having
 * one leaves the nested call failing with "schema.toJSON is not a function".
 *
 * The copy matters as much as the serializer: the service rebuilds a node from
 * what `toJSON` returns and then strips `meta.volatile` off that rebuild. A
 * serializer handing back the live spec therefore erases the flag on the first
 * read, after which the row disappears from Settings and every save is refused
 * as "not volatile". Each call has to yield an object the service may keep.
 */
function node(spec) {
  return { ...spec, toJSON: () => clone(spec) }
}

/** The same row as a plain node, which is the shape the settings form projects values through. */
const FIELDS = {
  keepDays: node(KEEP_DAYS_SPEC),
}

/** One keep-days value from anything a hand-edited config can hold. */
function keepDaysOf(config) {
  const raw = config === null || typeof config !== 'object' ? undefined : config.keepDays
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value)) return DEFAULT_KEEP_DAYS
  return Math.min(MAX_KEEP_DAYS, Math.max(MIN_KEEP_DAYS, Math.round(value)))
}

/** Exported as the row's Config so Settings can show the one number. */
export const Config = {
  ...SCHEMA,
  type: 'object', // ui-copy-ignore
  dict: FIELDS, // ui-copy-ignore
  meta: { default: {} }, // ui-copy-ignore
  toJSON() {
    return clone(SCHEMA)
  },
  '~standard': {
    version: 1, // ui-copy-ignore
    vendor: 'dsh-recent-tasks', // ui-copy-ignore
    validate(value) {
      const source = value !== null && typeof value === 'object' ? value : {}
      return { value: { ...source, keepDays: keepDaysOf(source) } }
    },
  },
}

export function apply() {}
