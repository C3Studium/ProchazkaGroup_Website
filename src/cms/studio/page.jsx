import dynamic from "next/dynamic"
import Head from "next/head"
import { useMemo } from "react"
import { studioChrome } from "../index.js"
import * as core from "../core/index.js"
import { createClaritySource } from "./stats/clarity.js"
import { registerStatsSource } from "./stats/statsSource.js"
import { usePagesNavigation } from "../runtime/pagesNavigation.jsx"

// Registers this project's content types. Wrapped rather than imported straight
// from `valecms.types` so the core's registry is cleared first — see
// `dev/schemas.js` for why that needs its own module.
import "./dev/schemas.js"

/**
 * The Studio's only mount point.
 *
 * Everything the admin needs is injected here, which is what keeps the two
 * contracts to one seam each:
 *
 *   core  Contract 1 — the schema API. Imported directly; it is pure and
 *         browser-safe.
 *   port  Contract 2 — all data access. Imported from
 *         `valecms/server/httpDataPort`, never from `valecms/server`: the barrel
 *         calls assertServer() and the HTTP port is the half that is meant to
 *         run in a browser. That split is what keeps the service-role key out
 *         of this bundle.
 *
 * The Studio itself is loaded client-side only. It is a stateful application
 * behind an auth gate and there is nothing to server-render.
 */
// Vytváří se uvnitř továrny, ne vedle ní: načítací obrazovka nese text, který
// je parametrem, a modulová konstanta by na něj neviděla. Továrna se volá jednou
// na projekt, takže tím nic nevzniká opakovaně.
const loadStudio = (booting) =>
  dynamic(() => import("./index.js"), {
    ssr: false,
    loading: () => <Booting label={booting} />,
  })

/**
 * Which port to hand the Studio.
 *
 * `NEXT_PUBLIC_CMS_DEV_PORT=1` swaps in the in-memory stub — the full Contract 2
 * surface over seeded fixtures, so the whole admin can be driven without a
 * database or a mail round-trip. It is behind an explicit flag rather than a
 * NODE_ENV check so a developer can also run the real port locally.
 */
const useDevPort = process.env.NEXT_PUBLIC_CMS_DEV_PORT === "1"

const loadPort = () =>
  useDevPort
    ? import("./dev/devPort.js").then((module) => module.createDevPort())
    : import("../server/httpDataPort.js").then((module) => module.createHttpDataPort())

/**
 * The Studio, ready to be a page.
 *
 * Everything below this line is the same in every project that mounts an admin
 * — the client-only load, the lazy port proxy, the chrome the host's `_app`
 * reads. Only the title differs. Shipping it as a factory means a consuming
 * project's route file is two lines instead of two hundred copied ones, and a
 * fix here reaches every project rather than the one that was copied last.
 *
 * @param {object}  [options]
 * @param {string}  [options.title]   Browser title and the Studio's own heading.
 * @param {string}  [options.booting] What the loading screen says; defaults to
 *   the title.
 * @returns {import('react').ComponentType} A page component, already wrapped in
 *   the Studio chrome. Export it as the default from a catch-all route.
 */
export const createStudioPage = ({ title = "Studio", booting = title } = {}) => {
  const Studio = loadStudio(booting)

  function StudioPage() {
    // Created once per mount. A port identity that changed on every render
    // would invalidate every data hook in the admin on every keystroke.
    const port = useMemo(() => createLazyPort(loadPort), [])

    // Zdroj statistik se registruje tady, protože tohle je jediné místo, které
    // drží port — a bez portu by zdroj neměl kam sáhnout pro data. Registrace
    // je idempotentní: druhé volání se stejným `id` jen přepíše to první.
    useMemo(() => registerStatsSource(createClaritySource(port)), [port])
    const navigation = usePagesNavigation()

    return (
      <>
        <Head>
          <title>{title}</title>
          {/* An admin behind a login has no business in an index. */}
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <Studio core={core} port={port} config={{ title }} navigation={navigation} />
      </>
    )
  }

  return studioChrome(StudioPage)
}

export default createStudioPage


/**
 * The port is loaded asynchronously (its module is client-only), but the Studio
 * expects a plain object it can call immediately. This forwards every call
 * through the pending import, so the first call awaits the module and every call
 * after it is direct.
 *
 * It names no methods. The previous version listed all twenty of them — the top
 * level, `media`, `auth`, `auth.users` — which made Contract 2's surface exist in
 * three places at once: the spec, every port implementation, and here. The
 * failure mode was quiet and expensive: a method added to the contract and to
 * both implementations still arrived in the Studio as `undefined`, because a
 * hardcoded list cannot forward a name nobody told it about. `archive` and
 * `restore` did exactly that and needed a shim to work around this file.
 *
 * The forwarding proxy is a function rather than an object so it can serve both
 * roles at once: `port.list` and `port.media` are indistinguishable until the
 * real port is in hand, so every property answers with something that can be
 * called (a method) or read into further (a namespace). Depth is unbounded —
 * `auth.users.create` needs three levels and nothing here counts them.
 */
function createLazyPort(load) {
  let pending = null
  const resolve = () => (pending ??= load())

  /**
   * Names that must NOT answer with a forwarder.
   *
   * `then` is the important one: anything with a callable `then` is a thenable,
   * so `await port` or a port that reached `Promise.resolve()` would call it and
   * wait forever for a resolution that never comes. Contract 2 has no method by
   * that name and never should. `toJSON` is the same trap for anything that
   * serialises the port, and every symbol is a language or tooling probe
   * (`Symbol.toPrimitive`, React's `$$typeof`, a devtools inspector) rather than
   * a port method.
   */
  const isProbe = (key) => typeof key === "symbol" || key === "then" || key === "toJSON"

  /**
   * A node at `path`. Reading a property returns the node one level deeper;
   * calling one resolves the module, walks `path` on the real port and invokes
   * the method there.
   *
   * The call is applied to its owner rather than destructured off it, so a port
   * written with `this` — a class instance, an object using shorthand methods
   * that reference siblings — behaves the same as the plain-object ones do.
   */
  const node = (path) => {
    const children = new Map()

    return new Proxy(
      // The target is a function purely so `apply` is a legal trap. Nothing ever
      // calls it; both traps below ignore it entirely.
      () => {},
      {
        get(_target, key) {
          if (isProbe(key)) return undefined
          // Memoised so repeated reads of `port.list` give the same function.
          // Hook dependency arrays compare by identity and a fresh forwarder per
          // render would re-fire every effect that mentions one.
          if (!children.has(key)) children.set(key, node([...path, key]))
          return children.get(key)
        },

        apply(_target, _thisArg, args) {
          const name = path[path.length - 1]
          const owner = path.slice(0, -1)

          return resolve().then((port) => {
            const holder = owner.reduce((current, key) => current?.[key], port)
            const method = holder?.[name]
            if (typeof method !== "function") {
              throw new Error(`[studio] The data port has no method ${path.join(".")}().`)
            }
            return method.apply(holder, args)
          })
        },
      },
    )
  }

  return node([])
}

function Booting({ label }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        display: "grid",
        placeItems: "center",
        background: "#0a0e13",
        color: "#647585",
        font: "300 13px/1 'Switzer-Variable', system-ui, sans-serif",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      Studio
    </div>
  )
}
