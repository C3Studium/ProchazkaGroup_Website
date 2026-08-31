import { fileURLToPath } from 'url';
import { dirname } from 'path';

// The CMS's own HTTP policy, owned by the library rather than by this file —
// see src/cms/nextConfig.mjs, which also records why it is a config
// contribution and not a middleware. `.mjs` because Node loads this config as
// a real ES module: a `.js` sibling in a package with no "type" field is
// reparsed with a MODULE_TYPELESS_PACKAGE_JSON warning on every dev start and
// every build.
import { cmsHeaders } from './src/cms/nextConfig.mjs';

// Which Supabase project this run talks to — see cms.database.js.
//
// It has to happen HERE, and this early. Next loads .env before it evaluates
// this file and inlines every NEXT_PUBLIC_* into the client bundle after it, so
// this is the one window where rewriting those names still reaches both the
// server and the browser. Doing it in a module the app imports would be too
// late: the value is already compiled in by then.
//
// It also has to happen above `supabaseStorageHosts()` below, which reads the
// resolved URL to decide which host next/image will load photos from.
import cmsDatabase from './cms.database.js';

const database = cmsDatabase.applyDatabaseEnv();

// Printed on every dev start and every build, deliberately. "Which database am
// I looking at" is the question behind most of the confusion this switch can
// cause, and an answer nobody has to go looking for is worth four lines.
console.log(
  `  CMS databáze: ${cmsDatabase.describeDatabase(database)}` +
    (database.applied ? '' : '  (nenakonfigurováno — beze změny)')
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The CMS keeps media as URLs on a Supabase Storage bucket (cms-media, made
// public-read by src/cms/server/migrations/0001_cms_tables.sql). next/image
// refuses any host not listed here, so without this an editor uploading a photo
// gets a broken image and no explanation.
//
// Derived from the project URL rather than pinned, because the hostname IS the
// project ref: the entry already below is a different project than the one in
// .env today, which is exactly the drift this avoids. The literal is kept as
// the floor for a build with no env loaded.
const supabaseStorageHosts = () => {
  const hosts = new Set(['gkzobudtjpucpstclmli.supabase.co']);
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      hosts.add(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname);
    }
  } catch {
    // A malformed URL is the environment's problem to report, not something
    // that should stop the whole config from loading.
  }
  return [...hosts].map((hostname) => ({
    protocol: 'https',
    hostname,
    // Public objects only. Anything else in Storage needs a signed URL, which
    // expires and therefore cannot be baked into a statically rendered page.
    pathname: '/storage/v1/object/public/**',
  }));
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Belt and braces on top of the process.env rewrite above: `env` is inlined
  // by name, so the browser cannot end up with a value from a .env that was
  // read after the switch ran. Only set when there is something to set —
  // an undefined here would compile to a literal `undefined` in the bundle.
  ...(database.applied
    ? {
        env: {
          NEXT_PUBLIC_SUPABASE_URL: database.url,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: database.anonKey,
        },
      }
    : {}),
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'prochazkagroup.cz',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.prochazkagroup.cz',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pg-website-nbzo0pdil-centrumprojects.vercel.app',
        pathname: '/**',
      },
      // A fourth entry stood here for a Supabase project this site no longer
      // uses. Removed rather than kept "just in case": checked against the live
      // database, and neither `people` (13 rows) nor `reviews` (37) holds a URL
      // on it — the portraits are local paths under /assets. An allowed host
      // that nothing serves is not a safety net, it is a hostname anyone
      // reading this config would take for the real one.
      ...supabaseStorageHosts(),
    ],
    // Add configured qualities to fix warnings
    qualities: [60,70, 80, 90, 100],
    // Improve image optimization settings
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Add output: 'standalone' for better Vercel deployment
  output: 'standalone',

  // The Studio's preview lists the site's pages by reading src/pages at request
  // time (src/cms/server/pages.js) — the only way that list cannot drift from the
  // routes it describes. A standalone build ships only the files the tracer saw
  // imported, and a readdir is invisible to it, so the sources are named here.
  // Without this the navigator falls back to the homepage alone in production.
  //
  // /api/studio/edit is the same readdir for the same list: /studio/edit is
  // inside the Studio's client-only catch-all and has no getStaticProps of its
  // own, so it asks for the pages over HTTP when its session opens.
  outputFileTracingIncludes: {
    '/studio/preview': ['./src/pages/**/*'],
    '/api/studio/edit': ['./src/pages/**/*'],
  },

  /**
   * The preview's iframe loads the site's own URLs, so nothing here rewrites
   * them — a rewrite was tried and removed, and the reason is worth keeping.
   *
   * Mirroring the site under /studio/preview/frame/* made the framed document a
   * real page at a real viewport, and it kept the edit flag off public URLs. But
   * a rewrite changes what the browser's address bar says without changing what
   * the server rendered, and this site reads its own address in five places:
   * navbar/body marks the active link with `pathname === href`, navbar/menu
   * swaps the CTA copy on /o-nas, and the footer and Contact branch on it too.
   * Inside the mirror no link was ever active, the CTA was wrong, and the
   * server/client disagreement was a hydration error on every page — measured,
   * not theorised. A preview that renders the navigation differently from the
   * site is a preview of something else.
   *
   * These two things stay, and neither is a rewrite:
   *  - the noindex header, because /studio/preview is a route a crawler could
   *    reach. It is no longer written here: it now comes from cmsHeaders(),
   *    which covers the whole Studio and the CMS API rather than the preview
   *    alone — /studio and /studio/edit were measured carrying no header at all,
   *    holding nothing back but a meta tag no crawler of /api/cms/* would parse;
   *  - the tracing include above, because the navigator reads src/pages at
   *    request time and a readdir is invisible to the standalone tracer.
   */
  async headers() {
    // Nothing of this site's own goes in this array. Every entry describes the
    // CMS's routes, so the CMS is what defines them; a public route acquiring a
    // header here would be a bug on the public site, which is why the sources
    // are prefixes of /studio and /api/cms and are asserted to be nothing else.
    return [...cmsHeaders()];
  },

  /**
   * The consultants' own pages live at /recenze/:slug — a review form for one
   * person, which is what the QR code on their business card points at.
   *
   * They were briefly at /poradci/:slug and this keeps that address alive. Not
   * a nicety: a printed code cannot be edited once it is on a card, so any
   * address these pages have ever answered on has to keep answering. Permanent,
   * because there is one canonical page and this is not it.
   */
  async redirects() {
    return [
      {
        source: '/poradci/:slug',
        destination: '/recenze/:slug',
        permanent: true,
      },
      // The twelve /reviews/* routes are gone. There was a page per adviser
      // and every one of them rendered nothing at all — an empty <main> under
      // the bar, its only component commented out. But they were real routes,
      // so they shipped in the sitemap and are indexed. A permanent redirect
      // is what they are owed: the reviews they were meant to hold live on
      // /recenze, so a reader or a crawler arriving on an old address lands
      // on the page that actually has them instead of on a 404.
      {
        source: '/reviews/:slug',
        destination: '/recenze',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;