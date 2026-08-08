# Procházka Group — corporate website

I hand-built this site for Procházka Group, a Czech financial advisory firm. No template, no page
builder. It's live at **[prochazkagroup.cz](https://www.prochazkagroup.cz/)**, it serves real clients,
and it does its job.

I've also grown past it. My taste and my standard moved faster than this codebase did, and I can see
every place where that's true. So I'm remodeling it to compete at Awwwards level — and the full
remodel is public in Figma, unpolished decisions included:
**[Figma remodel](https://www.figma.com/design/dL1RAWsbxKeh4yrPpZQPyW/Moment%C3%A1ln%C3%AD-Projekt?node-id=2289-41)**.

Open the live site and the Figma file side by side. That gap is the point — it's the clearest thing
I can show you about how I work now versus how I worked then.

## Stack & structure

Next.js 15 on the Pages Router, React 19, plain JavaScript, deployed on Vercel. Turbopack in dev,
`output: 'standalone'` for the build. All content is Czech.

- **Structure** — ~138 JS/JSX files under [src/](src/). Every component is a folder with `index.jsx`
  and its own co-located `styles.scss` (67 of them), grouped as `components/pages/*` (route-specific),
  `components/common/*` (navbar, footer, preloader, transitions, QnA), `components/ui/*` (buttons,
  dialogs, toasts) and `components/anim/*`.
- **Styling** — Tailwind 3 alongside per-component SCSS. Self-hosted Switzer, Satoshi and Zodiak
  (184 font files in [public/fonts/](public/fonts/), wired up through plain CSS in
  [public/css/](public/css/)) instead of a font CDN.
- **Motion** — Framer Motion across 67 files, Lenis for smooth scroll, `flubber` for SVG path
  morphing in the hero, plus a custom cursor, preloader and route transition layer.
- **Performance guard** — [PerformanceProvider.jsx](src/context/PerformanceProvider.jsx) reads
  `navigator.connection`, `hardwareConcurrency`, `deviceMemory` and viewport, and exposes
  `shouldReduceAnimations` so heavy sections can bail out on slow or weak devices.
- **Data** — Supabase for `people`, `reviews` and aggregate stats, read client-side through
  [useFetchDatabase.js](src/hooks/useFetchDatabase.js). Submitted reviews are inserted back.
- **Email** — Resend with 10 React Email templates in
  [src/modules/resend/emails/](src/modules/resend/emails/): admin/user pairs for the contact, benefit,
  newsletter, review and interest flows, sent via [/api/resend](src/pages/api/resend.js). Templates
  have their own Tailwind config so app CSS doesn't leak into inboxes.
- **Analytics & consent** — GTM, GA4 and Microsoft Clarity in
  [_document.js](src/pages/_document.js), all gated behind a cookie-consent check in
  [trackEvent.js](src/hooks/trackEvent.js) — no consent cookie, no event.
- **SEO** — per-page `<Head>`, Schema.org `FinancialService` JSON-LD, OG/Twitter cards,
  `next-sitemap` on postbuild with hand-set route priorities, and a
  [public/llm.txt](public/llm.txt) profile for LLM crawlers.
- **Routes** — 8 public pages (home, about, offers, benefit program, reviews, contact, cookies,
  privacy) plus 12 per-advisor review-collection landing pages under [/reviews/](src/pages/reviews/).

**What's in here but not wired up:** [resend-enhanced.js](src/pages/api/resend-enhanced.js) — a
second email pipeline with Supabase-backed open/click tracking and customer segmentation — is
complete but never called, its schema in [database/](database/email_tracking.sql) is still commented
out, and [useContactForm.js](src/hooks/useContactForm.js) is a stub that logs instead of sending.
I stopped mid-build once I decided to remodel rather than keep extending this codebase. Leaving it
visible is more useful to you than a quiet `git rm`.

## Screenshots

Not captured yet. This is what goes here, live and remodel side by side:

| View | What it shows |
| --- | --- |
| Home — hero | Preloader into the morphing SVG hero and stat bar. The single biggest visual gap. |
| Home — offer section | The long scroll-driven sequence: grid transitions, testimonials, requirements. |
| Benefit program | Densest page in the app — intro, info sections, reward cards, reviews. |
| Reviews | Supabase-backed listing plus the search/filter modal. |
| Advisor review page | One of the 12 per-advisor landing pages, portrait and contact rail. |
| Contact | Form, validation states, and the consent bar in its open state. |

## Links

- **Live site** — https://www.prochazkagroup.cz/
- **Figma remodel** — [Awwwards-level rebuild, public and in progress](https://www.figma.com/design/dL1RAWsbxKeh4yrPpZQPyW/Moment%C3%A1ln%C3%AD-Projekt?node-id=2289-41)
- **My portfolio** — [matejforejt.com](https://matejforejt.com)

MIT licensed. Client content, imagery and branding are not.
