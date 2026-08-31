/**
 * `@/cms` — what the host application is allowed to know about the library.
 *
 * Deliberately one thing: the seam where the app decides which shell a route
 * gets. `_app.js` runs on every public route, so anything re-exported here is
 * in the site's bundle for every visitor; `./shell` is a predicate, two
 * one-line markers and a component that renders its children, and it imports
 * nothing but React.
 *
 * Everything else the library does is reached at its own path — `@/cms/core`,
 * `@/cms/edit`, `@/cms/server` — because those have gates of their own to keep
 * (assertServer, the edit-mode flag) and a barrel that pulled them together
 * would be a barrel that defeats them.
 */
export {
  SITE_CHROME,
  STUDIO_CHROME,
  StudioShell,
  siteChrome,
  studioChrome,
  usesStudioChrome,
} from "./shell"
