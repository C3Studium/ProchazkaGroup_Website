/**
 * Fixture data for the Studio's in-memory dev port (./devPort.js). Never shipped.
 * Wrapper keys are underscore-prefixed (_id, _status, _createdAt, _updatedAt) so
 * they cannot collide with schema field names; `data` is the document body and
 * holds exactly the value shapes src/cms/core/fieldTypes.js accepts.
 */

// One file per page wired after this one — the homepage, /o-nas with the two
// surfaces `_app` renders under every route, and the two legal notices — so that
// no two of them are ever edited in the same place at once. Each is one import
// here and one spread below, and that is the whole seam.
import { seedAboutCopy } from './seedAbout.js'
import { seedBenefitCopy } from './seedBenefit.js'
import { seedCookiesCopy } from './seedCookies.js'
import { seedHomepageAssets, seedHomepageCopy } from './seedHomepage.js'
import { seedOfferCopy } from './seedNabidka.js'
import { seedPrivacyCopy } from './seedPrivacy.js'
import { seedReviewsCopy } from './seedReviewsPage.js'

/* ---------------------------------------------------------------- assets -- */

export const seedAssets = [
  {
    id: "asset-1",
    url: "/assets/portraits/business/1.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét muže v tmavém obleku před prosklenou stěnou kanceláře",
    filename: "1.webp",
    size: 184320,
    createdAt: "2025-11-04T09:12:00.000Z",
  },
  {
    id: "asset-2",
    url: "/assets/portraits/business/2.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét ženy ve světlém saku, ruce založené",
    filename: "2.webp",
    size: 167904,
    createdAt: "2025-11-04T09:14:00.000Z",
  },
  {
    id: "asset-3",
    url: "/assets/portraits/business/3.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét usmívajícího se muže v košili s kravatou",
    filename: "3.webp",
    size: 211456,
    createdAt: "2025-11-18T14:38:00.000Z",
  },
  {
    id: "asset-4",
    url: "/assets/portraits/business/4.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "",
    filename: "4.webp",
    size: 198140,
    createdAt: "2025-11-18T14:41:00.000Z",
  },
  {
    id: "asset-5",
    url: "/assets/portraits/business/5.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét muže sedícího u jednacího stolu",
    filename: "5.webp",
    size: 152880,
    createdAt: "2025-12-02T08:05:00.000Z",
  },
  {
    id: "asset-6",
    url: "/assets/portraits/business/6.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét ženy v tmavém saku na světlém pozadí",
    filename: "6.webp",
    size: 176512,
    createdAt: "2025-12-02T08:09:00.000Z",
  },
  {
    id: "asset-7",
    url: "/assets/portraits/business/7.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét mladšího poradce s notesem v ruce",
    filename: "7.webp",
    size: 143008,
    createdAt: "2025-12-16T11:27:00.000Z",
  },
  {
    id: "asset-8",
    url: "/assets/portraits/business/8.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét ženy s krátkými vlasy v bílé košili",
    filename: "8.webp",
    size: 205664,
    createdAt: "2026-01-09T13:02:00.000Z",
  },
  {
    id: "asset-9",
    url: "/assets/portraits/business/9.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "",
    filename: "9.webp",
    size: 189200,
    createdAt: "2026-01-09T13:05:00.000Z",
  },
  {
    id: "asset-10",
    url: "/assets/portraits/business/10.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét ženy u okna s výhledem do ulice",
    filename: "10.webp",
    size: 231744,
    createdAt: "2026-02-11T09:48:00.000Z",
  },
  {
    id: "asset-11",
    url: "/assets/portraits/business/11.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét muže se založenýma rukama v šedém saku",
    filename: "11.webp",
    size: 174336,
    createdAt: "2026-02-11T09:52:00.000Z",
  },
  {
    id: "asset-12",
    url: "/assets/portraits/business/12.webp",
    width: 1200,
    height: 1600,
    mime: "image/webp",
    alt: "Portrét usmívající se ženy v modrém svetru",
    filename: "12.webp",
    size: 160512,
    createdAt: "2026-03-04T16:20:00.000Z",
  },
  {
    id: "asset-13",
    url: "/logos/orbit/Allianz.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo pojišťovny Allianz",
    filename: "Allianz.webp",
    size: 48320,
    createdAt: "2026-03-04T16:31:00.000Z",
  },
  {
    id: "asset-14",
    url: "/logos/orbit/Amundi.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo investiční společnosti Amundi",
    filename: "Amundi.webp",
    size: 44180,
    createdAt: "2026-03-17T10:03:00.000Z",
  },
  {
    id: "asset-15",
    url: "/logos/orbit/Conseq.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo investiční společnosti Conseq",
    filename: "Conseq.webp",
    size: 51260,
    createdAt: "2026-03-17T10:06:00.000Z",
  },
  {
    id: "asset-16",
    url: "/logos/orbit/ING.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo banky ING",
    filename: "ING.webp",
    size: 41720,
    createdAt: "2026-04-02T08:44:00.000Z",
  },
  {
    id: "asset-17",
    url: "/logos/orbit/AXA.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo pojišťovny AXA",
    filename: "AXA.webp",
    size: 46980,
    createdAt: "2026-04-02T08:47:00.000Z",
  },
  {
    id: "asset-18",
    url: "/logos/orbit/gcp.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo Generali České pojišťovny",
    filename: "gcp.webp",
    size: 43640,
    createdAt: "2026-04-21T15:12:00.000Z",
  },
  {
    id: "asset-19",
    url: "/logos/orbit/csobpenzpoj.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo ČSOB Penzijní společnosti",
    filename: "csobpenzpoj.webp",
    size: 52840,
    createdAt: "2026-04-21T15:15:00.000Z",
  },
  {
    id: "asset-20",
    url: "/logos/orbit/ceskapojis.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo České pojišťovny",
    filename: "ceskapojis.webp",
    size: 57310,
    createdAt: "2026-05-13T12:38:00.000Z",
  },
  {
    id: "asset-21",
    url: "/logos/orbit/metlife.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "",
    filename: "metlife.webp",
    size: 61240,
    createdAt: "2026-05-13T12:41:00.000Z",
  },
  {
    id: "asset-22",
    url: "/logos/orbit/kooperativa.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo pojišťovny Kooperativa",
    filename: "kooperativa.webp",
    size: 49870,
    createdAt: "2026-06-24T07:55:00.000Z",
  },
  {
    id: "asset-23",
    url: "/logos/orbit/unicreditbank.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo UniCredit Bank",
    filename: "unicreditbank.webp",
    size: 55420,
    createdAt: "2026-07-15T09:30:00.000Z",
  },
  {
    id: "asset-24",
    url: "/logos/orbit/monetamb.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo Moneta Money Bank",
    filename: "monetamb.webp",
    size: 47600,
    createdAt: "2026-08-05T11:18:00.000Z",
  },
  {
    id: "asset-27",
    url: "/logos/orbit/cpp.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo České podnikatelské pojišťovny",
    filename: "cpp.webp",
    size: 50210,
    createdAt: "2026-08-05T11:20:00.000Z",
  },
  {
    id: "asset-28",
    url: "/logos/orbit/Komercnipojistovna.webp",
    width: 640,
    height: 360,
    mime: "image/webp",
    alt: "Logo Komerční pojišťovny",
    filename: "Komercnipojistovna.webp",
    size: 53870,
    createdAt: "2026-08-05T11:22:00.000Z",
  },
  // The two photographs the homepage ships with. They are in the library rather
  // than inlined into the two blocks below because an editor clicking one of
  // those photos is offered "replace", and replace means "pick another asset" —
  // a block pointing at a file that the library has never heard of would be the
  // one image in the system that cannot be swapped for a sibling.
  {
    id: "asset-25",
    url: "/assets/backgrounds/secondOffice_1300.webp",
    width: 1300,
    height: 867,
    mime: "image/webp",
    alt: "Nabídky pro klienty",
    filename: "secondOffice_1300.webp",
    size: 92314,
    createdAt: "2025-11-05T08:30:00.000Z",
  },
  {
    id: "asset-26",
    url: "/assets/backgrounds/conferenceFront.webp",
    width: 6014,
    height: 4016,
    mime: "image/webp",
    alt: "Přednáška Procházka Group",
    filename: "conferenceFront.webp",
    size: 858018,
    createdAt: "2025-11-05T08:31:00.000Z",
  },
  // The three photographs beside the cards of /o-nas's showcase, in the library
  // for the same reason as the two above: a block pointing at a file the library
  // has never heard of is the one image in the system that cannot be replaced.
  // Dimensions and sizes are the files' own, read off /public.
  {
    id: "asset-29",
    url: "/assets/backgrounds/callBG.webp",
    width: 6000,
    height: 4000,
    mime: "image/webp",
    alt: "Václav Procházka v kanceláři",
    filename: "callBG.webp",
    size: 985672,
    createdAt: "2025-11-27T13:20:00.000Z",
  },
  {
    id: "asset-30",
    url: "/assets/backgrounds/workingHours.webp",
    width: 6014,
    height: 4016,
    mime: "image/webp",
    alt: "Konzultace v kanceláři Procházka Group",
    filename: "workingHours.webp",
    size: 1366518,
    createdAt: "2025-11-27T13:22:00.000Z",
  },
  {
    id: "asset-31",
    url: "/assets/backgrounds/conference2.webp",
    width: 6000,
    height: 4000,
    mime: "image/webp",
    alt: "Školení týmu Procházka Group",
    filename: "conference2.webp",
    size: 606616,
    createdAt: "2025-11-27T13:24:00.000Z",
  },
  // The five photographs the rest of the homepage ships with — the hero, the
  // three cards of the deck in "Pro naše klienty", and the trophies on the last
  // panel of the ride. In ./seedHomepage.js beside the blocks that point at
  // them, and spread in here so they are rows of the library too: a block
  // pointing at a file the library has never heard of is the one image in the
  // system that cannot be replaced with a sibling.
  ...seedHomepageAssets,
]

/** An image field holds the whole asset object — a copy, so the two never alias. */
const asset = (id) => ({ ...seedAssets.find((entry) => entry.id === id) })

/** A logo stood in for a partner that has none of its own yet. */
const genericLogo = (id) => ({ ...asset(id), alt: "Logo partnera" })

/* ------------------------------------------------------------- documents -- */

// The roster on /o-nas, and the file's own acceptance test applied to a list of
// people rather than to a block of copy.
//
// ---------------------------------------------------------------------------
// Why these are the ten in src/constants/people.js
// ---------------------------------------------------------------------------
// Colleagues used to read that constant directly and could therefore offer
// nothing to click: a name, a motto and a portrait are fields of ONE document,
// and a document needs an id. Wiring the section to this type is what gives it
// one — and it makes the CMS the roster, so whatever is here is who is on the
// page.
//
// Which means these fixtures decide whether that wiring changed the page. They
// used to be a cast of invented consultants, so it would have: ten different
// names, ten different portraits, ten different telephone numbers. The rule this
// file states at the top — every string is the value the component already falls
// back to, every image is the file it already names — is exactly the rule that
// makes the change a no-op, and it had never been applied to the roster. It is
// now: the ten published rows below are src/constants/people.js and MOTTOS,
// copied, in that order.
//
// What is NOT copied, because there is nothing to copy it from:
//
//   - `academicTitle` is empty on all ten. people.js prints no titles, and the
//     page prints people.js. (The live `people` table does carry one, "Mgr." on
//     Václav Procházka — importing it will add a word to the page.)
//   - `email`, `facebook`, `instagram` and `story` are empty. people.js has no
//     such columns; the three icons under the portrait are the office's
//     accounts, not the person's, and they come from `o-nas.links`. Inventing
//     an address per person would put nine wrong mailto: links on the site.
//   - `portraitDetail` is the second photograph the client asked for, and it is
//     filled for exactly the four people who have a `srcAlt` in people.js. The
//     other six have one photograph and the missing ones are the client's to
//     supply — the live table has a single image column, so the import cannot
//     invent them either.
//   - "Jane Doe" and "Layla Doe" are placeholders standing in people.js itself.
//     They are copied as they are rather than resolved: their portraits match
//     rows in the live table (business/9 is unique, business/2 is shared by
//     three people), so the second cannot be identified from the data at all.
//     The popup on the page is now where they get corrected.
//   - `legacyId` is the row in the live `people` table this person is, where the
//     portrait identifies it unambiguously. The two placeholders have none.
//
// The three that are NOT on the page are the three below that are archived or
// unpublished — no `active` flag was added, because `status` and `archived_at`
// already answer the question and are already enforced by the RLS policy on
// cms_document (migrations/0003) rather than by a filter anyone can forget.
const consultant = [
  {
    _id: "consultant-1",
    _status: "published",
    _createdAt: "2025-11-04T09:20:00.000Z",
    _updatedAt: "2026-06-02T10:12:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Václav",
      lastName: "Procházka",
      slug: "prochazka-vaclav",
      kind: "consultant",
      motto: "Finance mají dávat klid, ne starosti.",
      story: "",
      // Paths into /public rather than library assets, which is the shape
      // scripts/cms-migrate.js writes for every imported portrait: the files
      // are in the repo and there is no object in a bucket behind them.
      portrait: { url: "/assets/portraits/business/11.webp", alt: "Václav Procházka", legacy: true },
      portraitDetail: { url: "/assets/portraits/casual/11.webp", alt: "Václav Procházka", legacy: true },
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 0,
      stats: { likes: 312, reviewCount: 9 },
      legacyId: 1,
    },
  },
  {
    _id: "consultant-2",
    _status: "published",
    _createdAt: "2025-11-04T09:24:00.000Z",
    _updatedAt: "2026-05-18T08:41:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Ondřej",
      lastName: "Efenberk",
      slug: "efenberk-ondrej",
      kind: "consultant",
      motto: "Nejlepší plán je ten, kterému rozumíte.",
      story: "",
      portrait: { url: "/assets/portraits/business/17.webp", alt: "Ondřej Efenberk", legacy: true },
      portraitDetail: { url: "/assets/portraits/casual/17.webp", alt: "Ondřej Efenberk", legacy: true },
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 1,
      stats: { likes: 198, reviewCount: 6 },
      legacyId: 4,
    },
  },
  {
    _id: "consultant-3",
    _status: "published",
    _createdAt: "2025-11-18T14:50:00.000Z",
    _updatedAt: "2026-04-27T13:05:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Michaela",
      lastName: "Marková",
      slug: "markova-michaela",
      kind: "consultant",
      motto: "Bez malých písmen a bez spěchu.",
      story: "",
      portrait: { url: "/assets/portraits/business/8.webp", alt: "Michaela Marková", legacy: true },
      // No second photograph in people.js, and none in the live table either.
      portraitDetail: null,
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 2,
      stats: { likes: 141, reviewCount: 5 },
      legacyId: 2,
    },
  },
  {
    _id: "consultant-4",
    _status: "published",
    _createdAt: "2025-11-18T14:55:00.000Z",
    _updatedAt: "2026-07-09T09:33:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Tereza",
      lastName: "Marková",
      slug: "markova-tereza",
      kind: "consultant",
      motto: "Malé kroky, které vydrží roky.",
      story: "",
      portrait: { url: "/assets/portraits/business/6.webp", alt: "Tereza Marková", legacy: true },
      portraitDetail: { url: "/assets/portraits/casual/6.webp", alt: "Tereza Marková", legacy: true },
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 3,
      stats: { likes: 267, reviewCount: 7 },
      legacyId: 3,
    },
  },
  {
    _id: "consultant-5",
    _status: "published",
    _createdAt: "2025-12-02T08:15:00.000Z",
    _updatedAt: "2026-03-30T15:47:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Tereza",
      lastName: "Posnerová",
      slug: "posnerova-tereza",
      kind: "consultant",
      motto: "Za každým číslem stojí něčí život.",
      story: "",
      portrait: { url: "/assets/portraits/business/12.webp", alt: "Tereza Posnerová", legacy: true },
      portraitDetail: { url: "/assets/portraits/casual/12.webp", alt: "Tereza Posnerová", legacy: true },
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 4,
      stats: { likes: 122, reviewCount: 4 },
      legacyId: 8,
    },
  },
  {
    _id: "consultant-6",
    _status: "published",
    _createdAt: "2025-12-02T08:22:00.000Z",
    _updatedAt: "2026-06-15T11:09:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Lukáš",
      lastName: "Matouš",
      slug: "matous-lukas",
      kind: "consultant",
      motto: "Nejdřív poslouchat, potom počítat.",
      story: "",
      portrait: { url: "/assets/portraits/business/18.webp", alt: "Lukáš Matouš", legacy: true },
      portraitDetail: null,
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 5,
      stats: { likes: 176, reviewCount: 5 },
      legacyId: 6,
    },
  },
  {
    _id: "consultant-7",
    _status: "published",
    _createdAt: "2025-12-16T11:35:00.000Z",
    _updatedAt: "2026-05-05T14:26:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Olga",
      lastName: "Kaslová",
      slug: "kaslova-olga",
      kind: "consultant",
      motto: "Jistota se staví po vrstvách.",
      story: "",
      portrait: { url: "/assets/portraits/business/15.webp", alt: "Olga Kaslová", legacy: true },
      portraitDetail: null,
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 6,
      stats: { likes: 134, reviewCount: 5 },
      legacyId: 9,
    },
  },
  {
    _id: "consultant-8",
    _status: "published",
    _createdAt: "2026-01-09T13:12:00.000Z",
    _updatedAt: "2026-07-22T10:54:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Lukáš",
      lastName: "Vituj",
      slug: "vituj-lukas",
      kind: "consultant",
      motto: "Rozhodnutí, která obstojí za deset let.",
      story: "",
      // The same file as Lukáš Matouš above, in people.js and in the live
      // table both. Copied rather than corrected: a portrait nobody has taken
      // is the client's to supply, and swapping in a different face here would
      // change the page.
      portrait: { url: "/assets/portraits/business/18.webp", alt: "Lukáš Vituj", legacy: true },
      portraitDetail: null,
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 7,
      stats: { likes: 209, reviewCount: 6 },
      legacyId: 10,
    },
  },
  {
    _id: "consultant-9",
    _status: "published",
    _archivedAt: "2026-07-02T09:40:00.000Z",
    _createdAt: "2026-01-09T13:18:00.000Z",
    _updatedAt: "2026-06-30T08:15:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Jakub",
      lastName: "Šimek",
      slug: "jakub-simek",
      kind: "consultant",
      motto: "Bez čísel je to jenom dojem.",
      story:
        "Dělám modelace a srovnání nabídek pro celý tým, takže mám dobrý přehled o tom, která banka zrovna dává nejlepší podmínky. Vlastním klientům nejčastěji řeším první hypotéku a refinancování spotřebitelských úvěrů.",
      portrait: asset("asset-9"),
      portraitDetail: null,
      phone: "+420 602 559 104",
      email: "jakub.simek@prochazkagroup.cz",
      facebook: "https://www.facebook.com/simek.hypoteky",
      instagram: "",
      order: 10,
      stats: { likes: 97, reviewCount: 4 },
      legacyId: 9,
    },
  },
  {
    _id: "consultant-10",
    _status: "published",
    _createdAt: "2026-02-11T10:02:00.000Z",
    _updatedAt: "2026-07-28T16:40:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Jane",
      lastName: "Doe",
      slug: "doe-jane",
      kind: "consultant",
      motto: "Žádná otázka není hloupá.",
      story: "",
      portrait: { url: "/assets/portraits/business/9.webp", alt: "Jane Doe", legacy: true },
      portraitDetail: null,
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 8,
      stats: { likes: 158, reviewCount: 5 },
    },
  },
  {
    _id: "consultant-11",
    _status: "published",
    _createdAt: "2026-02-11T10:08:00.000Z",
    _updatedAt: "2026-08-04T09:21:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Layla",
      lastName: "Doe",
      slug: "doe-layla",
      kind: "consultant",
      motto: "Peníze mají sloužit, ne velet.",
      story: "",
      portrait: { url: "/assets/portraits/business/2.webp", alt: "Layla Doe", legacy: true },
      portraitDetail: null,
      phone: "+420777111222",
      email: "",
      facebook: "",
      instagram: "",
      order: 9,
      stats: { likes: 143, reviewCount: 5 },
    },
  },
  {
    _id: "consultant-12",
    _status: "draft",
    _createdAt: "2026-08-06T12:44:00.000Z",
    _updatedAt: "2026-08-12T15:17:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Michaela",
      lastName: "Veselá",
      slug: "michaela-vesela",
      kind: "consultant",
      motto: "Začínám tam, kde má klient největší obavu.",
      story:
        "Do týmu jsem nastoupila letos na jaře po pěti letech na přepážce spořitelny. Věnuji se hlavně spoření na bydlení a pojištění mladých rodin. Profil zatím doplňuji, fotku máme novou z červencového focení.",
      portrait: asset("asset-12"),
      portraitDetail: null,
      phone: "+420 608 117 452",
      email: "michaela.vesela@prochazkagroup.cz",
      facebook: "",
      instagram: "",
      order: 11,
      stats: { likes: 4, reviewCount: 0 },
      legacyId: 12,
    },
  },
  // The second archived fixture, and a draft one on purpose. The two rows in
  // the archive differ in what restoring them does — this one goes back to
  // being a draft, Jakub Šimek above goes straight back onto the web — which is
  // the whole reason archiving is a separate column from `status`.
  {
    _id: "consultant-14",
    _status: "draft",
    _archivedAt: "2026-05-19T11:05:00.000Z",
    _createdAt: "2026-03-02T10:30:00.000Z",
    _updatedAt: "2026-04-11T14:52:00.000Z",
    data: {
      academicTitle: "Ing.",
      firstName: "Radek",
      lastName: "Hruška",
      slug: "hruska-radek",
      kind: "consultant",
      motto: "Napřed rezerva, potom všechno ostatní.",
      story:
        "Nastoupil na jaře, profil se rozepsal a spolupráce nakonec nezačala. Záznam zůstal rozepsaný a nikdy nebyl na webu — archiv je tady proto, aby nemusel být smazaný.",
      portrait: null,
      portraitDetail: null,
      phone: "",
      email: "",
      facebook: "",
      instagram: "",
      order: 13,
      stats: { likes: 0, reviewCount: 0 },
    },
  },
  {
    _id: "consultant-13",
    _status: "draft",
    _createdAt: "2026-08-08T09:02:00.000Z",
    _updatedAt: "2026-08-08T09:02:00.000Z",
    data: {
      academicTitle: "",
      firstName: "Benefit",
      lastName: "Program",
      slug: "benefit-program",
      kind: "program",
      motto: "Výhody pro zaměstnance našich partnerů.",
      story:
        "Není to poradce, ale program. Existuje proto, aby se recenze na benefitní část dala připsat něčemu konkrétnímu. Kontaktní údaje záměrně nemá, zájemce vždy přebírá konkrétní poradce.",
      portrait: null,
      portraitDetail: null,
      phone: "",
      email: "",
      facebook: "",
      instagram: "",
      order: 12,
      stats: { likes: 61, reviewCount: 3 },
      legacyId: 13,
    },
  },
]

const partner = [
  {
    _id: "partner-1",
    _status: "published",
    _createdAt: "2025-11-06T10:00:00.000Z",
    _updatedAt: "2026-02-14T11:22:00.000Z",
    data: {
      name: "Allianz",
      slug: "allianz",
      kind: "financial",
      logo: asset("asset-13"),
      url: "https://www.allianz.cz",
      description: "Životní a majetkové pojištění, penzijní spoření.",
      order: 1,
      active: true,
    },
  },
  {
    _id: "partner-2",
    _status: "published",
    _createdAt: "2025-11-06T10:04:00.000Z",
    _updatedAt: "2026-02-14T11:24:00.000Z",
    data: {
      name: "Amundi",
      slug: "amundi",
      kind: "financial",
      logo: asset("asset-14"),
      url: "https://www.amundi.cz",
      description: "Podílové fondy a pravidelné investiční programy.",
      order: 3,
      active: true,
    },
  },
  {
    _id: "partner-3",
    _status: "published",
    _createdAt: "2025-11-06T10:08:00.000Z",
    _updatedAt: "2026-03-02T09:15:00.000Z",
    data: {
      name: "Conseq Investment Management",
      slug: "conseq",
      kind: "financial",
      logo: asset("asset-15"),
      url: "https://www.conseq.cz",
      description: "Investiční programy pro dlouhodobé spoření a penzi.",
      order: 8,
      active: true,
    },
  },
  {
    _id: "partner-4",
    _status: "published",
    _createdAt: "2025-11-06T10:12:00.000Z",
    _updatedAt: "2026-03-02T09:18:00.000Z",
    data: {
      name: "ING Bank",
      slug: "ing-bank",
      kind: "financial",
      logo: asset("asset-16"),
      url: "https://www.ing.cz",
      description: "Spořicí účty a investice bez vstupních poplatků.",
      order: 7,
      active: true,
    },
  },
  {
    _id: "partner-5",
    _status: "published",
    _createdAt: "2025-11-06T10:16:00.000Z",
    _updatedAt: "2026-04-08T13:41:00.000Z",
    data: {
      name: "AXA",
      slug: "axa",
      kind: "financial",
      logo: asset("asset-17"),
      url: "https://www.uniqa.cz",
      description: "Životní pojištění a penzijní spoření.",
      order: 5,
      active: true,
    },
  },
  {
    _id: "partner-6",
    _status: "published",
    _createdAt: "2025-11-06T10:20:00.000Z",
    _updatedAt: "2026-04-08T13:44:00.000Z",
    data: {
      name: "Generali Česká pojišťovna",
      slug: "generali-ceska-pojistovna",
      kind: "financial",
      logo: asset("asset-18"),
      url: "https://www.generaliceska.cz",
      description: "Pojištění majetku, vozidel a odpovědnosti.",
      order: 6,
      active: true,
    },
  },
  {
    _id: "partner-7",
    _status: "published",
    _createdAt: "2025-11-06T10:24:00.000Z",
    _updatedAt: "2026-05-19T08:52:00.000Z",
    data: {
      name: "ČSOB Penzijní společnost",
      slug: "csob-penzijni-spolecnost",
      kind: "financial",
      logo: asset("asset-19"),
      url: "https://www.csob-penze.cz",
      description: "Doplňkové penzijní spoření a transformovaný fond.",
      order: 9,
      active: true,
    },
  },
  {
    _id: "partner-8",
    _status: "published",
    _createdAt: "2025-11-06T10:28:00.000Z",
    _updatedAt: "2026-05-19T08:55:00.000Z",
    data: {
      name: "Česká pojišťovna",
      slug: "ceska-pojistovna",
      kind: "financial",
      logo: asset("asset-20"),
      url: "https://www.ceskapojistovna.cz",
      description: "Pojištění majetku, vozidel a odpovědnosti.",
      order: 2,
      active: true,
    },
  },
  {
    _id: "partner-9",
    _status: "published",
    _createdAt: "2025-11-06T10:32:00.000Z",
    _updatedAt: "2026-06-11T10:07:00.000Z",
    data: {
      name: "MetLife",
      slug: "metlife",
      kind: "financial",
      logo: asset("asset-21"),
      url: "https://www.metlife.cz",
      description: "Životní a úrazové pojištění.",
      order: 10,
      active: true,
    },
  },
  {
    _id: "partner-10",
    _status: "published",
    _createdAt: "2025-11-06T10:36:00.000Z",
    _updatedAt: "2026-06-11T10:11:00.000Z",
    data: {
      name: "Kooperativa",
      slug: "kooperativa",
      kind: "financial",
      logo: asset("asset-22"),
      url: "https://www.koop.cz",
      description: "Pojištění vozidel, nemovitostí a podnikatelských rizik.",
      order: 4,
      active: true,
    },
  },
  {
    _id: "partner-11",
    _status: "published",
    _createdAt: "2025-11-06T10:40:00.000Z",
    _updatedAt: "2026-07-03T14:29:00.000Z",
    data: {
      name: "UniCredit Bank",
      slug: "unicredit-bank",
      kind: "financial",
      logo: asset("asset-23"),
      url: "https://www.unicreditbank.cz",
      description: "Hypotéky a účty pro klienty i podnikatele.",
      order: 14,
      active: true,
    },
  },
  {
    _id: "partner-15",
    _status: "published",
    _createdAt: "2025-11-06T10:44:00.000Z",
    _updatedAt: "2026-07-03T14:33:00.000Z",
    data: {
      name: "Moneta Money Bank",
      slug: "moneta-money-bank",
      kind: "financial",
      logo: asset("asset-24"),
      url: "https://www.moneta.cz",
      description: "Účty, úvěry a hypotéky pro klienty i podnikatele.",
      order: 11,
      active: true,
    },
  },
  {
    _id: "partner-16",
    _status: "published",
    _createdAt: "2025-11-06T10:48:00.000Z",
    _updatedAt: "2026-07-03T14:36:00.000Z",
    data: {
      name: "Česká podnikatelská pojišťovna",
      slug: "ceska-podnikatelska-pojistovna",
      kind: "financial",
      logo: asset("asset-27"),
      url: "https://www.cpp.cz",
      description: "Povinné ručení, majetek a pojištění podnikatelů.",
      order: 12,
      active: true,
    },
  },
  {
    _id: "partner-17",
    _status: "published",
    _createdAt: "2025-11-06T10:52:00.000Z",
    _updatedAt: "2026-07-03T14:39:00.000Z",
    data: {
      name: "Komerční pojišťovna",
      slug: "komercni-pojistovna",
      kind: "financial",
      logo: asset("asset-28"),
      url: "https://www.kb-pojistovna.cz",
      description: "Životní pojištění a spoření navázané na bankovní produkty.",
      order: 13,
      active: true,
    },
  },
  {
    _id: "partner-12",
    _status: "published",
    _createdAt: "2026-01-20T09:14:00.000Z",
    _updatedAt: "2026-07-16T11:38:00.000Z",
    data: {
      name: "Pojistné hlášení",
      slug: "pojistne-hlaseni",
      kind: "local",
      logo: genericLogo("asset-24"),
      url: "https://www.pojistnehlaseni.cz",
      description:
        "Kancelář, která za klienta vyřídí hlášení a likvidaci pojistné události. Naši klienti mají první konzultaci zdarma a přednostní termín do tří pracovních dnů.",
      order: 15,
      active: true,
    },
  },
  {
    _id: "partner-13",
    _status: "published",
    _createdAt: "2026-02-26T13:50:00.000Z",
    _updatedAt: "2026-07-16T11:41:00.000Z",
    data: {
      name: "ElevenCosmetic",
      slug: "elevencosmetic",
      kind: "local",
      logo: genericLogo("asset-22"),
      url: "https://www.elevencosmetic.cz",
      description:
        "Kosmetický salon ve Zlíně. Pro klienty Procházka Group platí sleva na ošetření pleti a na první návštěvu i konzultace zdarma.",
      order: 16,
      active: true,
    },
  },
  {
    _id: "partner-14",
    _status: "draft",
    _createdAt: "2026-08-01T08:26:00.000Z",
    _updatedAt: "2026-08-11T16:03:00.000Z",
    data: {
      name: "ReKvítka",
      slug: "rekvitka",
      kind: "local",
      logo: genericLogo("asset-20"),
      url: "https://www.rekvitka.cz",
      description:
        "Květinářství a floristické studio. Spolupráce se domlouvá, sleva pro klienty zatím není potvrzená, proto je záznam neveřejný.",
      order: 17,
      active: false,
    },
  },
]

const offer = [
  {
    _id: "offer-1",
    _status: "published",
    _createdAt: "2026-02-26T14:02:00.000Z",
    _updatedAt: "2026-06-18T09:44:00.000Z",
    data: {
      title: "Sleva 15 % na kosmetické ošetření",
      slug: "sleva-15-procent-na-kosmeticke-osetreni",
      description:
        "Klienti Procházka Group mají u ElevenCosmetic slevu 15 % na všechna ošetření pleti. Stačí se při objednání prokázat jménem svého poradce.",
      partner: { _ref: "partner-13", _type: "partner" },
      image: asset("asset-22"),
      url: "https://www.elevencosmetic.cz/nabidka-prochazka-group",
      offerStatus: "active",
      validUntil: "2026-12-31",
      order: 1,
    },
  },
  {
    _id: "offer-2",
    _status: "published",
    _createdAt: "2026-01-20T09:30:00.000Z",
    _updatedAt: "2026-07-16T11:52:00.000Z",
    data: {
      title: "Hlášení pojistné události zdarma",
      slug: "hlaseni-pojistne-udalosti-zdarma",
      description:
        "První konzultace a kompletní zpracování hlášení škody bez poplatku, včetně komunikace s pojišťovnou. Přednostní termín do tří pracovních dnů.",
      partner: { _ref: "partner-12", _type: "partner" },
      image: asset("asset-24"),
      url: "https://www.pojistnehlaseni.cz/pro-klienty",
      offerStatus: "active",
      validUntil: null,
      order: 2,
    },
  },
  {
    _id: "offer-3",
    _status: "published",
    _createdAt: "2025-12-09T10:18:00.000Z",
    _updatedAt: "2026-05-27T15:06:00.000Z",
    data: {
      title: "Hypotéka bez poplatku za zpracování",
      slug: "hypoteka-bez-poplatku-za-zpracovani",
      description:
        "U vybraných hypoték od ČSOB odpouštíme klientům poplatek za zpracování žádosti. Nabídka platí pro nové úvěry i pro refinancování z jiné banky.",
      partner: { _ref: "partner-7", _type: "partner" },
      image: asset("asset-19"),
      url: "https://www.csob.cz/hypoteky",
      offerStatus: "active",
      validUntil: "2026-10-31",
      order: 3,
    },
  },
  {
    _id: "offer-4",
    _status: "draft",
    _createdAt: "2026-06-30T13:22:00.000Z",
    _updatedAt: "2026-08-07T10:35:00.000Z",
    data: {
      title: "Zvýhodněné vedení účtu pro klienty",
      slug: "zvyhodnene-vedeni-uctu-pro-klienty",
      description:
        "Vedení běžného účtu bez poplatku po dobu dvou let pro klienty, kteří u nás uzavřeli hypotéku. Podmínky se s bankou ještě dolaďují.",
      partner: { _ref: "partner-5", _type: "partner" },
      image: asset("asset-17"),
      url: "https://www.kb.cz/ucty",
      offerStatus: "negotiating",
      validUntil: null,
      order: 4,
    },
  },
  {
    _id: "offer-5",
    _status: "draft",
    _createdAt: "2026-07-24T08:47:00.000Z",
    _updatedAt: "2026-08-13T09:12:00.000Z",
    data: {
      title: "Květiny pro klienty se slevou 10 %",
      slug: "kvetiny-pro-klienty-se-slevou-10-procent",
      description:
        "Sleva 10 % na vazby a dárkové kytice v květinářství ReKvítka. Nabídka se připravuje, spuštění plánujeme na podzim.",
      partner: { _ref: "partner-14", _type: "partner" },
      image: asset("asset-20"),
      url: "https://www.rekvitka.cz",
      offerStatus: "preparing",
      validUntil: null,
      order: 5,
    },
  },
  {
    _id: "offer-6",
    _status: "published",
    _createdAt: "2025-11-25T11:05:00.000Z",
    _updatedAt: "2026-04-06T08:58:00.000Z",
    data: {
      title: "Investiční program bez vstupního poplatku",
      slug: "investicni-program-bez-vstupniho-poplatku",
      description:
        "Pravidelná investice do fondů Conseq bez vstupního poplatku při sjednání do konce března. Nabídka skončila, na stránce zůstává kvůli odkazům z newsletteru.",
      partner: { _ref: "partner-3", _type: "partner" },
      image: asset("asset-15"),
      url: "https://www.conseq.cz/investicni-programy",
      offerStatus: "ended",
      validUntil: "2026-03-31",
      order: 6,
    },
  },
]

const qna = [
  {
    _id: "qna-1",
    _status: "published",
    _createdAt: "2025-11-10T09:00:00.000Z",
    _updatedAt: "2026-03-11T10:24:00.000Z",
    data: {
      question: "Kolik stojí schůzka s poradcem?",
      answer:
        "Úvodní schůzka je zdarma a nezavazuje vás k ničemu dalšímu. Odměnu dostáváme od finančních institucí až ve chvíli, kdy se pro některé řešení rozhodnete. Pokud se rozhodnete nic neuzavřít, nic neplatíte.",
      category: "obecne",
      order: 1,
    },
  },
  {
    _id: "qna-2",
    _status: "published",
    _createdAt: "2025-11-10T09:06:00.000Z",
    _updatedAt: "2026-03-11T10:26:00.000Z",
    data: {
      question: "Jak dlouho trvá vyřízení hypotéky?",
      answer:
        "Od kompletních podkladů po schválení bankou to obvykle trvá dva až tři týdny. Zdržet to může odhad nemovitosti nebo chybějící potvrzení o příjmu. Celý proces hlídáme za vás a o každém kroku dáváme vědět.",
      category: "sluzby",
      order: 2,
    },
  },
  {
    _id: "qna-3",
    _status: "published",
    _createdAt: "2025-12-04T14:31:00.000Z",
    _updatedAt: "2026-04-02T09:47:00.000Z",
    data: {
      question: "Co si mám vzít na první schůzku?",
      answer:
        "Stačí občanský průkaz a přehled o tom, co dnes platíte, tedy smlouvy o pojištění, spoření nebo úvěrech. Pokud je nemáte po ruce, nevadí, dohledáme je společně. Konkrétní doklady k hypotéce řešíme až v okamžiku, kdy víme, kterou banku vybíráme.",
      category: "obecne",
      order: 3,
    },
  },
  {
    _id: "qna-4",
    _status: "published",
    _createdAt: "2025-12-04T14:38:00.000Z",
    _updatedAt: "2026-04-02T09:50:00.000Z",
    data: {
      question: "Můžu si nechat poradit i online?",
      answer:
        "Ano, běžně děláme schůzky přes videohovor a dokumenty podepisujeme elektronicky. Osobní setkání doporučujeme u první hypotéky, kde se probírá hodně detailů najednou. Volba je vždycky na vás.",
      category: "sluzby",
      order: 4,
    },
  },
  {
    _id: "qna-5",
    _status: "published",
    _createdAt: "2026-01-15T11:12:00.000Z",
    _updatedAt: "2026-05-08T13:19:00.000Z",
    data: {
      question: "Co je benefit program a pro koho je určený?",
      answer:
        "Benefit program je balíček výhod pro zaměstnance firem, se kterými spolupracujeme. Zaměstnanec získá bezplatnou revizi svých smluv, přednostní termíny schůzek a slevy u našich lokálních partnerů. Firmu to nestojí nic, stačí program zaměstnancům představit.",
      category: "benefit",
      order: 5,
    },
  },
  {
    _id: "qna-6",
    _status: "published",
    _createdAt: "2026-01-15T11:20:00.000Z",
    _updatedAt: "2026-05-08T13:22:00.000Z",
    data: {
      question: "Jak se do benefit programu zapojí naše firma?",
      answer:
        "Ozvěte se nám a domluvíme si krátkou schůzku s vedením nebo s personálním oddělením. Připravíme letáček a krátkou prezentaci pro zaměstnance, obvykle na dvacet minut. Zapojení je nezávazné a kdykoliv se dá ukončit.",
      category: "benefit",
      order: 6,
    },
  },
  {
    _id: "qna-7",
    _status: "published",
    _createdAt: "2026-02-19T08:55:00.000Z",
    _updatedAt: "2026-06-04T15:33:00.000Z",
    data: {
      question: "Musím kvůli spolupráci měnit banku?",
      answer:
        "Nemusíte. Pracujeme s nabídkami většiny bank na trhu a spočítáme vám, jestli se změna vůbec vyplatí. Pokud vychází lépe zůstat, řekneme vám to.",
      category: "sluzby",
      order: 7,
    },
  },
  {
    _id: "qna-8",
    _status: "published",
    _createdAt: "2026-02-19T09:02:00.000Z",
    _updatedAt: "2026-06-04T15:36:00.000Z",
    data: {
      question: "Jak nakládáte s mými osobními údaji?",
      answer:
        "Zpracováváme jen údaje, které potřebujeme k přípravě nabídky a k uzavření smlouvy. Nepředáváme je nikomu kromě finanční instituce, se kterou smlouvu uzavíráte. Souhlas můžete kdykoliv odvolat a údaje na vaši žádost smažeme.",
      category: "obecne",
      order: 8,
    },
  },
  {
    _id: "qna-9",
    _status: "draft",
    _createdAt: "2026-07-09T10:41:00.000Z",
    _updatedAt: "2026-08-05T12:07:00.000Z",
    data: {
      question: "Hledáte nové poradce do týmu?",
      answer:
        "Ano, průběžně přijímáme kolegy do poboček ve Zlíně a v Otrokovicích. Zkušenost z financí není podmínkou, důležitější je ochota se učit a chuť pracovat s lidmi. Nováčky vede zkušený poradce a první tři měsíce mají zajištěné zaškolení.",
      category: "kariera",
      order: 9,
    },
  },
  {
    _id: "qna-10",
    _status: "draft",
    _createdAt: "2026-07-09T10:48:00.000Z",
    _updatedAt: "2026-08-05T12:10:00.000Z",
    data: {
      question: "Jak vypadá odměňování poradců?",
      answer:
        "Odměna se skládá z provizí za sjednané smlouvy a z podílu na výsledcích pobočky. V prvním roce nabízíme garantovanou částku, aby začátek nebyl závislý jen na provizích. Konkrétní čísla probíráme na osobní schůzce, protože se liší podle role.",
      category: "kariera",
      order: 10,
    },
  },
]

const siteCopy = [
  {
    _id: "siteCopy-1",
    _status: "published",
    _createdAt: "2025-11-05T08:10:00.000Z",
    _updatedAt: "2026-05-21T09:38:00.000Z",
    data: {
      key: "home-hero",
      page: "index",
      title: "Finance, kterým budete rozumět",
      body:
        "Provedeme vás hypotékou, investicemi i pojištěním tak, abyste na konci věděli, proč jste se rozhodli právě takhle.\n\nPrvní schůzka je zdarma a k ničemu vás nezavazuje. Sejdeme se u nás na pobočce, u vás doma nebo online.",
      items: [],
    },
  },
  {
    _id: "siteCopy-2",
    _status: "published",
    _createdAt: "2025-11-05T08:16:00.000Z",
    _updatedAt: "2026-06-09T14:52:00.000Z",
    data: {
      key: "home-statbar",
      page: "index",
      title: "Čísla, která za nás mluví",
      body: "",
      items: [
        { lead: "", label: "Let na trhu", value: "12", note: "7" },
        { lead: "", label: "Spokojených klientů", value: "3000+", note: "2500" },
        { lead: "", label: "Poradců v týmu", value: "13", note: "8" },
        { lead: "", label: "Partnerských institucí", value: "43", note: "30" },
      ],
    },
  },
  {
    _id: "siteCopy-3",
    _status: "published",
    _createdAt: "2025-11-27T13:05:00.000Z",
    _updatedAt: "2026-04-14T10:19:00.000Z",
    data: {
      key: "o-nas-intro",
      page: "o-nas",
      title: "Kdo jsme",
      body:
        "Procházka Group je tým třinácti poradců se zázemím ve Zlíně a v Otrokovicích. Začínali jsme v roce 2014 ve dvou lidech a jedné kanceláři nad lékárnou.\n\nDnes se staráme o víc než tři tisíce klientů, ale princip zůstal stejný: každý klient má svého poradce, který mu zvedne telefon i za tři roky.",
      items: [],
    },
  },
  {
    _id: "siteCopy-4",
    _status: "published",
    _createdAt: "2025-11-27T13:12:00.000Z",
    _updatedAt: "2026-06-25T11:44:00.000Z",
    data: {
      key: "o-nas-hodnoty",
      page: "o-nas",
      title: "Jak pracujeme",
      body: "Tři pravidla, která platí bez výjimky.",
      items: [
        {
          lead: "01",
          label: "Nejdřív poslouchat",
          value:
            "První schůzka je z devadesáti procent o vás. Než něco doporučíme, musíme vědět, co vás v penězích tlačí a co si můžete dovolit.",
          note: "",
        },
        {
          lead: "02",
          label: "Srovnávat naslepo",
          value:
            "Nabídky bank a pojišťoven porovnáváme podle čísel, ne podle toho, kdo zrovna dává lepší provizi. Srovnání vám necháme písemně.",
          note: "",
        },
        {
          lead: "03",
          label: "Zůstat po podpisu",
          value:
            "Konec fixace, pojistná událost, změna příjmu. To jsou okamžiky, kdy poradce má být k zastižení, a proto vás po podpisu neopustíme.",
          note: "",
        },
      ],
    },
  },
  {
    _id: "siteCopy-5",
    _status: "published",
    _createdAt: "2026-01-16T09:28:00.000Z",
    _updatedAt: "2026-07-02T15:11:00.000Z",
    data: {
      key: "benefit-program-kroky",
      page: "benefit-program",
      title: "Jak benefit program funguje",
      body: "Od prvního e-mailu k výhodám pro zaměstnance to trvá obvykle tři týdny.",
      items: [
        {
          lead: "1/3",
          label: "Domluvíme si schůzku",
          value: "Sejdeme se s vedením firmy nebo s personálním oddělením a projdeme, co program obsahuje.",
          note: "20 minut",
        },
        {
          lead: "2/3",
          label: "Představíme program zaměstnancům",
          value: "Připravíme letáček a krátkou prezentaci. Zaměstnanci se hlásí sami, účast je dobrovolná.",
          note: "",
        },
        {
          lead: "3/3",
          label: "Rozdělíme zájemce mezi poradce",
          value: "Každý zájemce dostane svého poradce a termín do deseti dnů. Firmu to nestojí nic.",
          note: "do 10 dnů",
        },
      ],
    },
  },
  {
    _id: "siteCopy-6",
    _status: "draft",
    _createdAt: "2026-07-28T10:02:00.000Z",
    _updatedAt: "2026-08-14T13:26:00.000Z",
    data: {
      key: "nabidky-uvod",
      page: "nabidky",
      title:
        "Partneři a nabídky, které pro vás vyjednáváme, protože spolupracujeme jen s institucemi a firmami, jejichž podmínky, rychlost schvalování a přístup ke klientům odpovídají tomu, co od finančního poradenství očekáváme my sami i naši klienti v regionu",
      body:
        "Finanční instituce v seznamu níž jsou ty, ze kterých umíme klientovi nabídnout smlouvu. Lokální partneři dávají našim klientům slevu nebo přednostní termín.\n\nNadpis je zatím pracovní a je moc dlouhý, potřebuje zkrátit před publikací.",
      items: [],
    },
  },
  {
    _id: "siteCopy-7",
    _status: "published",
    _createdAt: "2026-02-05T11:47:00.000Z",
    _updatedAt: "2026-05-30T08:23:00.000Z",
    data: {
      key: "recenze-uvod",
      page: "recenze",
      title: "Co o nás říkají klienti",
      body:
        "Recenze píší klienti sami po skončení spolupráce. Nezveřejňujeme je automaticky, každou si přečteme, ale text neupravujeme.\n\nPokud jste u nás něco řešili, budeme rádi za pár řádků. Napsat je můžete konkrétnímu poradci nebo k benefit programu.",
      items: [],
    },
  },
  {
    _id: "siteCopy-8",
    _status: "published",
    _createdAt: "2025-11-05T08:22:00.000Z",
    _updatedAt: "2026-08-03T09:05:00.000Z",
    data: {
      key: "footer-kontakt",
      page: "global",
      title: "Kde nás najdete",
      body: "Kanceláře jsou otevřené v pracovní dny od 8 do 17 hodin, schůzku doporučujeme domluvit předem.",
      items: [
        {
          lead: "",
          label: "Zlín",
          value: "Náměstí Míru 174, 760 01 Zlín",
          note: "+420 602 145 388",
        },
        {
          lead: "",
          label: "Otrokovice",
          value: "tř. Osvobození 1388, 765 02 Otrokovice",
          note: "+420 604 271 903",
        },
      ],
    },
  },

  /* The two blocks the homepage's visual editing is declared against.
   *
   * `src/cms/visualEditing.js` names them — HOMEPAGE_COPY_KEYS and the two
   * VISUAL_SURFACES entries — and nothing in this file held them, which is the
   * direct reason nothing on the page was ever annotated: no document, no id,
   * and `editable()` emits nothing without one. So they are here, and they are
   * PUBLISHED, because the public homepage reads `data` on published rows only
   * and the visible page must not change when these load.
   *
   * Every string below is the value the component already falls back to, copied
   * rather than rewritten. The Offers lines carry the `*…*` highlight
   * convention that `server/site/homepage.js` decodes; run them through
   * `parseHighlights` and you get Offers' FALLBACK_COPY_LINES back exactly.
   * That is the acceptance test for these two documents: the page renders the
   * same text, from the CMS instead of from the component. */
  {
    _id: "siteCopy-9",
    _status: "published",
    _createdAt: "2025-11-05T08:34:00.000Z",
    _updatedAt: "2026-08-12T09:41:00.000Z",
    data: {
      key: "index.offers",
      page: "index",
      title: "Naši partneři",
      body: "",
      image: asset("asset-25"),
      // One item per rendered line, because the section reveals them one at a
      // time — see Offers/CopyLine. `lead`, `value` and `note` have no meaning
      // for this block and stay empty rather than being repurposed.
      items: [
        { lead: "", label: "*Spolupracujeme* s partnery OVB Group", value: "", note: "" },
        { lead: "", label: "a předními finančními domy,", value: "", note: "" },
        { lead: "", label: "díky kterým pro vás máme *slevy*", value: "", note: "" },
        { lead: "", label: "i u *lokálních obchodů* ve vašem okolí.", value: "", note: "" },
      ],
    },
  },
  {
    _id: "siteCopy-10",
    _status: "published",
    _createdAt: "2025-11-05T08:36:00.000Z",
    _updatedAt: "2026-08-12T09:44:00.000Z",
    data: {
      key: "index.who-we-are",
      page: "index",
      title: "Kdo jsme",
      // Stored plain. `body` is richText and the section splits it per
      // character to animate it, so what reaches the page is `plainText(body)`
      // — one paragraph, no markup, no double spaces, or the reveal windows are
      // computed against characters that are not there.
      body: "Jsme skupina lidí, která pomáhá vám lidem se dostat z finančních situací a nebo i vás i seznámit jak náš systém v republice funguje, na co si dát pozor, čemu se vyhnout, a tvoříme pro vás pomocnou ruku, které se můžete chytit a vybudovat si vlastní finanční zabezpečení do budoucnosti",
      image: asset("asset-26"),
      items: [],
    },
  },

  /* /o-nas, on exactly the terms the two blocks above were added on.
   *
   * `src/cms/visualEditing.js` names them (ABOUT_COPY_KEYS) and
   * `src/cms/server/site/aboutUs.js` reads them. PUBLISHED, because the public
   * page reads `data` on published rows only and the visible page must not
   * change when these load: every string below is the value the component
   * already falls back to, copied rather than rewritten, and every image points
   * at the asset whose url is the file the component already names.
   *
   * The `*…*` highlight convention is deliberately NOT used in any of them.
   * These labels are rendered verbatim — nothing on /o-nas draws an accent span
   * — so an asterisk here would go on the page as an asterisk. See the note at
   * the head of aboutUs.js. */
  {
    _id: "siteCopy-11",
    _status: "published",
    _createdAt: "2025-11-27T13:18:00.000Z",
    _updatedAt: "2026-08-12T10:02:00.000Z",
    data: {
      key: "o-nas.hero",
      page: "o-nas",
      title: "O nás",
      body: "",
      // The alt is the hero's own, not asset-26's: the same photograph is used
      // twice on the site and the two sections describe it differently. An
      // image field holds the asset, so it holds the asset's alt too, and
      // overriding it here is what keeps the rendered attribute what it was.
      image: { ...asset("asset-26"), alt: "Školení týmu Procházka Group" },
      // The three marks under the photograph. The icons are not here and cannot
      // be: they are React components chosen in the file, and the count is
      // fixed by it — see aboutUs.js on why every list is merged by index.
      items: [
        { lead: "", label: "13 let praxe", value: "", note: "" },
        { lead: "", label: "Individuální přístup", value: "", note: "" },
        { lead: "", label: "Výsledky", value: "", note: "" },
      ],
    },
  },
  {
    _id: "siteCopy-12",
    _status: "published",
    _createdAt: "2025-11-27T13:26:00.000Z",
    _updatedAt: "2026-08-12T10:05:00.000Z",
    data: {
      key: "o-nas.showcase",
      page: "o-nas",
      title: "Poznámka pod kartami",
      // One sentence under all three cards, because it is the section's own
      // voice rather than the speaker's. Held once, so the three cannot drift.
      body: "Dáváme šanci novým kolegům vybudovat si úspěšné podnikání ve financích. Učíme je pracovat poctivě, efektivně a se smyslem.",
      items: [],
    },
  },
  /* One block per card. siteCopy holds a single `image`, so this is the only
   * shape in which each card's photograph is separately replaceable; the order
   * is ABOUT_COPY_KEYS.showcaseMembers, not the order they happen to sit in
   * here. `items[0].lead` is the card's ordinal — stored so the Studio shows
   * which card is which, not annotated: it is a position in a fixed list of
   * three, and typing "07" into the first one is not an edit anybody means. */
  {
    _id: "siteCopy-13",
    _status: "published",
    _createdAt: "2025-11-27T13:28:00.000Z",
    _updatedAt: "2026-08-12T10:08:00.000Z",
    data: {
      key: "o-nas.showcase.zalozeni",
      page: "o-nas",
      title: "Založení",
      body: "Založil jsem tým, který dnes tvoří už přes 10 profesionálů a všichni sdílíme stejnou vizi",
      image: asset("asset-29"),
      items: [{ lead: "01", label: "Založení", value: "", note: "" }],
    },
  },
  {
    _id: "siteCopy-14",
    _status: "published",
    _createdAt: "2025-11-27T13:30:00.000Z",
    _updatedAt: "2026-08-12T10:10:00.000Z",
    data: {
      key: "o-nas.showcase.kolegove",
      page: "o-nas",
      title: "Kolegové",
      body: "Těší mě vidět mé spolupracovníky vítězit a plnit si své cíle v životě s finanční nezávislostí.",
      image: asset("asset-30"),
      items: [{ lead: "02", label: "Kolegové", value: "", note: "" }],
    },
  },
  {
    _id: "siteCopy-15",
    _status: "published",
    _createdAt: "2025-11-27T13:32:00.000Z",
    _updatedAt: "2026-08-12T10:12:00.000Z",
    data: {
      key: "o-nas.showcase.hodnoty",
      page: "o-nas",
      title: "Hodnoty",
      body: "V našem týmu jsme zasadili pevné zásady a hodnoty, které nás nesou kupředu k úspěchům",
      image: asset("asset-31"),
      items: [{ lead: "03", label: "Hodnoty", value: "", note: "" }],
    },
  },
  {
    _id: "siteCopy-16",
    _status: "published",
    _createdAt: "2025-11-27T13:34:00.000Z",
    _updatedAt: "2026-08-12T10:14:00.000Z",
    data: {
      key: "o-nas.colleagues",
      page: "o-nas",
      title: "Naši kolegové",
      body: "",
      // Two items rather than one string split on a space: each line of this
      // heading is its own element with its own rule drawn under it, and a
      // field can only be written back by one element.
      items: [
        { lead: "", label: "Naši", value: "", note: "" },
        { lead: "", label: "kolegové", value: "", note: "" },
      ],
    },
  },

  /* The patička, which `_app` renders under every route — see
   * `src/cms/server/site/footer.js` for how it reaches a component that no page
   * owns. PUBLISHED, and every string is the component's own.
   *
   * The non-breaking spaces are the markup's (`Kontakt&nbsp;| 8-16`), and they
   * are load-bearing: `stringValue` hands the label through untouched, which is
   * why these lines are read as `title` / `items[].label` and never through
   * `plainText` — `\s` in JavaScript matches U+00A0, so the plain reading would
   * quietly turn each one into an ordinary space.
   *
   * What is NOT here, and why: the claim and its call to action are set with a
   * hard `<br />` in them and the in-place editor is single-line; the telephone,
   * the e-mail address and the two social buttons are links, which want
   * `editableLink`; and "© Design&Code C3IStudium" is the developer's own
   * credit, out of scope on the same terms as MyButton. */
  {
    _id: "siteCopy-17",
    _status: "published",
    _createdAt: "2025-11-05T08:40:00.000Z",
    _updatedAt: "2026-08-12T10:20:00.000Z",
    data: {
      key: "global.footer",
      page: "global",
      title: "Kde nás\u00a0 najdete",
      body: "",
      items: [
        // FOOTER_LINES in server/site/footer.js names these positions.
        { lead: "", label: "Kontakt\u00a0| 8-16", value: "", note: "" },
        { lead: "", label: "Smetanova 78/1, 39701 Písek\u00a0 |", value: "", note: "" },
        { lead: "", label: "2024 © ProcházkaGroup Všechna práva udělena", value: "", note: "" },
      ],
    },
  },

  ...seedAboutCopy,
  ...seedBenefitCopy,
  ...seedCookiesCopy,
  ...seedHomepageCopy,
  ...seedOfferCopy,
  ...seedPrivacyCopy,
  ...seedReviewsCopy,
]

/* ----------------------------------------------------------------- reviews -- */
/* 14 schválených (starší, publikované) a 23 čekajících z posledních tří měsíců. */

const review = [
  {
    _id: "review-1",
    _status: "published",
    _createdAt: "2025-11-08T10:14:00.000Z",
    _updatedAt: "2025-11-11T09:02:00.000Z",
    data: {
      customerName: "Marie Kovářová",
      consultantName: "Václav Procházka",
      message:
        "S manželem jsme řešili hypotéku poprvé v životě a upřímně jsme z toho měli strach. Pan Procházka si na nás vzal celé odpoledne, prošel s námi tři nabídky bank a u každé vysvětlil, co znamená fixace, co se stane po jejím konci a kolik by nás stálo předčasné splacení. Nikam nás netlačil a nechal nám čas si to doma promyslet. Když jsme se za týden ozvali, měl už připravené podklady a od podpisu žádosti k čerpání to trvalo necelých pět týdnů. Nejvíc oceňuji, že nám volal i ve chvílích, kdy se zrovna nic nedělo, jen aby řekl, v jaké fázi to je.",
      hashtag: "poradce",
      approved: true,
      likes: 24,
      order: 1,
      submittedAt: "2025-11-08T10:14:00.000Z",
      source: "import",
    },
  },
  {
    _id: "review-2",
    _status: "published",
    _createdAt: "2025-11-19T16:41:00.000Z",
    _updatedAt: "2025-11-21T08:35:00.000Z",
    data: {
      customerName: "Petr Zeman",
      consultantName: "Ondřej Efenberk",
      message: "Rychlé jednání a jasné vysvětlení. Doporučuji.",
      hashtag: "poradce",
      approved: true,
      likes: 12,
      order: 2,
      submittedAt: "2025-11-19T16:41:00.000Z",
      source: "import",
    },
  },
  {
    _id: "review-3",
    _status: "published",
    _createdAt: "2025-12-03T09:27:00.000Z",
    _updatedAt: "2025-12-05T10:12:00.000Z",
    data: {
      customerName: "Jana Šťastná",
      consultantName: "Michaela Marková",
      message:
        "Pojištění domácnosti jsme měli deset let stejné a nikdy jsme ho neotevřeli. Pan Dvořák nám ukázal, na co se vlastně vztahuje, a ušetřili jsme skoro tisícovku ročně při vyšším krytí.",
      hashtag: "poradce",
      approved: true,
      likes: 8,
      order: 3,
      submittedAt: "2025-12-03T09:27:00.000Z",
      source: "import",
    },
  },
  {
    _id: "review-4",
    _status: "published",
    _createdAt: "2025-12-14T18:52:00.000Z",
    _updatedAt: "2025-12-17T11:20:00.000Z",
    data: {
      customerName: "Radek Malý",
      consultantName: "Tereza Marková",
      message:
        "Refinancování jsem odkládal dva roky, protože jsem si myslel, že je to spousta papírování a že to za tu úsporu nestojí. Paní Nováková mi hned na první schůzce spočítala rozdíl mezi mojí sazbou a tím, co je na trhu teď, a rozdíl byl přes dva tisíce měsíčně. Podklady po mně chtěla jednou, všechno ostatní obíhala sama, a když banka požadovala doplnit odhad nemovitosti, domluvila odhadce a řekla mi jen termín. Za celou dobu jsem musel osobně někam jít dvakrát. Kdybych to měl shrnout, ušetřil jsem peníze i čas a příště se neptám nikoho jiného.",
      hashtag: "poradce",
      approved: true,
      likes: 31,
      order: 4,
      submittedAt: "2025-12-14T18:52:00.000Z",
      source: "import",
    },
  },
  {
    _id: "review-5",
    _status: "published",
    _createdAt: "2026-01-07T11:33:00.000Z",
    _updatedAt: "2026-01-09T09:47:00.000Z",
    data: {
      customerName: "Veronika Urbanová",
      consultantName: "Tereza Posnerová",
      message: "Revize smluv přes zaměstnavatele, vše rychle a mile.",
      hashtag: "benefitprogram",
      approved: true,
      likes: 5,
      order: 5,
      submittedAt: "2026-01-07T11:33:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-6",
    _status: "published",
    _createdAt: "2026-01-21T14:09:00.000Z",
    _updatedAt: "2026-01-23T13:31:00.000Z",
    data: {
      customerName: "Lukáš Pospíšil",
      consultantName: "Lukáš Matouš",
      message:
        "Sestavili jsme si rozpočet na celý rok a poprvé jsem viděl, kam mi peníze mizí. Nebylo to příjemné, ale bylo to užitečné. Od té doby odkládáme každý měsíc, aniž bychom to na výdajích poznali.",
      hashtag: "poradce",
      approved: true,
      likes: 17,
      order: 6,
      submittedAt: "2026-01-21T14:09:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-7",
    _status: "published",
    _createdAt: "2026-02-02T08:16:00.000Z",
    _updatedAt: "2026-02-04T15:55:00.000Z",
    data: {
      customerName: "Alena Fialová",
      consultantName: "Olga Kaslová",
      message:
        "Investování jsem se dlouho bála, protože jsem tomu nerozuměla a měla jsem pocit, že mi někdo prodá něco, čemu neporozumím ani potom. Pan Beneš mi celou dobu ukazoval čísla na obrazovce a nechal mě ptát se na hlouposti tak dlouho, dokud jsem si nebyla jistá. Nastavili jsme pravidelnou investici, kterou zvládnu i v horším měsíci, a domluvili jsme se, že jednou ročně se sejdeme a projdeme, jestli to dává smysl dál. Když loni trhy spadly, ozval se sám a vysvětlil, proč není důvod nic měnit. To pro mě znamenalo víc než jakýkoliv výnos.",
      hashtag: "poradce",
      approved: true,
      likes: 9,
      order: 7,
      submittedAt: "2026-02-02T08:16:00.000Z",
      source: "import",
    },
  },
  {
    _id: "review-8",
    _status: "published",
    _createdAt: "2026-02-18T19:28:00.000Z",
    _updatedAt: "2026-02-20T10:04:00.000Z",
    data: {
      customerName: "Michal Sedláček",
      consultantName: "Lukáš Vituj",
      message: "Vyřízeno rychle a bez zbytečných papírů.",
      hashtag: "poradce",
      approved: true,
      likes: 3,
      order: 8,
      submittedAt: "2026-02-18T19:28:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-9",
    _status: "published",
    _createdAt: "2026-03-05T10:02:00.000Z",
    _updatedAt: "2026-03-07T09:18:00.000Z",
    data: {
      customerName: "Simona Řeháková",
      consultantName: "Jakub Šimek",
      message:
        "O programu jsem se dozvěděla v práci a čekala jsem klasickou prodejní přednášku. Místo toho mi pan Šimek prošel staré smlouvy, dvě doporučil zrušit a nic mi nenabídl. Za měsíc jsem se ozvala sama.",
      hashtag: "benefitprogram",
      approved: true,
      likes: 21,
      order: 9,
      submittedAt: "2026-03-05T10:02:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-10",
    _status: "published",
    _createdAt: "2026-03-19T13:44:00.000Z",
    _updatedAt: "2026-03-22T08:29:00.000Z",
    data: {
      customerName: "Karel Bláha",
      consultantName: "Jane Doe",
      message:
        "Je mi padesát čtyři, splácím hypotéku a zároveň pomáhám dceři se školou v zahraničí, takže rozpočet je napjatý a odchod do penze jsem raději neřešil. Paní Pokorná to vzala z druhé strany. Nejdřív jsme si spočítali, co se stane, když vypadne můj příjem, a teprve potom jsme se bavili o spoření. Vyšlo z toho, že si můžu dovolit odkládat méně, než jsem si myslel, ale o dost dřív, než jsem plánoval. Celé to trvalo tři schůzky a odešel jsem s papírem, na kterém je napsáno, co dělám a proč.",
      hashtag: "poradce",
      approved: true,
      likes: 14,
      order: 10,
      submittedAt: "2026-03-19T13:44:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-11",
    _status: "published",
    _createdAt: "2026-04-02T09:11:00.000Z",
    _updatedAt: "2026-04-03T14:38:00.000Z",
    data: {
      customerName: "Tereza Vávrová",
      consultantName: "Layla Doe",
      message: "Konečně někdo, kdo o penězích mluví lidsky.",
      hashtag: "poradce",
      approved: true,
      likes: 6,
      order: 11,
      submittedAt: "2026-04-02T09:11:00.000Z",
      source: "studio",
    },
  },
  {
    _id: "review-12",
    _status: "published",
    _createdAt: "2026-04-16T17:05:00.000Z",
    _updatedAt: "2026-04-18T11:52:00.000Z",
    data: {
      customerName: "Josef Kratochvíl",
      consultantName: "Václav Procházka",
      message:
        "Spolupracujeme šestým rokem, prošli jsme spolu hypotékou, pojištěním firmy i prodejem bytu po tchýni. Pokaždé to bylo bez řečí a bez zdržování. Volám mu i s věcmi, které vlastně nejsou jeho práce.",
      hashtag: "poradce",
      approved: true,
      likes: 28,
      order: 12,
      submittedAt: "2026-04-16T17:05:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-13",
    _status: "published",
    _createdAt: "2026-04-29T12:37:00.000Z",
    _updatedAt: "2026-05-02T09:14:00.000Z",
    data: {
      customerName: "Nikola Doležalová",
      consultantName: "Benefit Program",
      message:
        "Zaměstnavatel nám program představil na jaře a přihlásila jsem se hlavně kvůli tomu, že revize smluv byla zdarma a nezavazovala k ničemu. Přinesla jsem složku papírů, které jsem deset let jen zakládala. Vyšlo najevo, že platím dvě životní pojistky, které se z poloviny překrývají, a že spořicí účet z roku 2016 má sazbu, o které je lepší nemluvit. Během dvou schůzek jsme to srovnali a měsíčně mi zbylo skoro dva a půl tisíce. Nikdo mi přitom netlačil žádnou novou smlouvu, což jsem upřímně čekala.",
      hashtag: "benefitprogram",
      approved: true,
      likes: 11,
      order: 13,
      submittedAt: "2026-04-29T12:37:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-14",
    _status: "published",
    _createdAt: "2026-05-10T08:49:00.000Z",
    _updatedAt: "2026-05-12T13:07:00.000Z",
    data: {
      customerName: "Pavel Richter",
      consultantName: "Ondřej Efenberk",
      message:
        "Chtěl jsem začít investovat menší částku a bál jsem se, že mě s tím nikdo nebude brát vážně. Opak byl pravdou, dostal jsem stejnou péči, jako kdybych přinesl milion. Za rok a půl jsem částku ztrojnásobil, ne výnosem, ale tím, že to dává smysl.",
      hashtag: "poradce",
      approved: true,
      likes: 7,
      order: 14,
      submittedAt: "2026-05-10T08:49:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-15",
    _status: "draft",
    _createdAt: "2026-05-24T14:22:00.000Z",
    _updatedAt: "2026-05-24T14:22:00.000Z",
    data: {
      customerName: "Hana Musilová",
      consultantName: "Michaela Marková",
      message:
        "Pojistnou událost po vytopení koupelny jsme hlásili v pátek večer a v pondělí ráno už byl domluvený technik. Sami bychom to řešili měsíc. Děkujeme za trpělivost s našimi dotazy.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 15,
      submittedAt: "2026-05-24T14:22:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-16",
    _status: "draft",
    _createdAt: "2026-05-29T09:03:00.000Z",
    _updatedAt: "2026-05-29T09:03:00.000Z",
    data: {
      customerName: "Filip Kadlec",
      consultantName: "Tereza Posnerová",
      message: "Skvělý přístup, všechno vyřízeno do týdne.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 16,
      submittedAt: "2026-05-29T09:03:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-17",
    _status: "draft",
    _createdAt: "2026-06-02T20:16:00.000Z",
    _updatedAt: "2026-06-02T20:16:00.000Z",
    data: {
      customerName: "Zdeňka Pilařová",
      consultantName: "Tereza Marková",
      message:
        "Po rozvodu jsem zůstala s hypotékou sama a banka mi řekla, že s mým příjmem převod nepůjde. Paní Nováková našla řešení, o kterém jsem nevěděla, že existuje, a část dluhu jsme přeúvěrovali jinam s ručitelem z rodiny. Trvalo to skoro čtyři měsíce a několikrát jsem byla přesvědčená, že to nedopadne. Ozývala se i o víkendu, když bylo potřeba doložit něco do pondělí. Byt jsem si nakonec nechala a splátka je nižší než ta původní společná. Nevím, jak bych to zvládla sama.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 17,
      submittedAt: "2026-06-02T20:16:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-18",
    _status: "draft",
    _createdAt: "2026-06-06T11:41:00.000Z",
    _updatedAt: "2026-06-07T08:12:00.000Z",
    data: {
      customerName: "Ivan Krejčí",
      consultantName: "Lukáš Matouš",
      message:
        "Domluvená schůzka se dvakrát přesouvala, což mě mrzelo, ale výsledek stál za to. Paní Marková nakonec přijela až k nám domů a zůstala déle, než měla. Rozpočet nám sedí a spoření běží.",
      hashtag: "poradce",
      approved: false,
      likes: 1,
      order: 18,
      submittedAt: "2026-06-06T11:41:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-19",
    _status: "draft",
    _createdAt: "2026-06-11T15:58:00.000Z",
    _updatedAt: "2026-06-11T15:58:00.000Z",
    data: {
      customerName: "Barbora Sýkorová",
      consultantName: "Olga Kaslová",
      message: "Revize smluv v práci, ušetřila jsem 900 Kč měsíčně.",
      hashtag: "benefitprogram",
      approved: false,
      likes: 0,
      order: 19,
      submittedAt: "2026-06-11T15:58:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-20",
    _status: "draft",
    _createdAt: "2026-06-14T03:27:00.000Z",
    _updatedAt: "2026-06-14T03:27:00.000Z",
    data: {
      customerName: "Rychlá Půjčka 24",
      consultantName: "Václav Procházka",
      message:
        "PŮJČKA BEZ REGISTRU IHNED NA ÚČET!!! Až 500 000 Kč do 15 minut, bez doložení příjmu, bez zástavy. Napište na www.pujcka-ihned-bez-registru.example.com nebo volejte non stop. Schválíme každého!!!",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 20,
      submittedAt: "2026-06-14T03:27:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-21",
    _status: "draft",
    _createdAt: "2026-06-18T10:34:00.000Z",
    _updatedAt: "2026-06-18T10:34:00.000Z",
    data: {
      customerName: "Marek Beneš",
      consultantName: "Lukáš Vituj",
      message:
        "Manželka byla dlouhodobě v pracovní neschopnosti a ukázalo se, že pojistka, kterou jsme platili sedm let, na její diagnózu vůbec nemíří. Paní Horáková se do toho pustila s pojišťovnou za nás a i když se z původní smlouvy nedalo vytáhnout všechno, část plnění jsme nakonec dostali. Zároveň nám nastavila novou smlouvu tak, aby se tohle neopakovalo, a ukázala nám v podmínkách přesně ta místa, kde jsme minule doplatili na to, že jsme je nečetli. Byla to nepříjemná zkušenost, ale díky ní víme, za co platíme.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 21,
      submittedAt: "2026-06-18T10:34:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-22",
    _status: "draft",
    _createdAt: "2026-06-23T18:07:00.000Z",
    _updatedAt: "2026-06-23T18:07:00.000Z",
    data: {
      customerName: "Denisa Kolářová",
      consultantName: "Jakub Šimek",
      message: "Mladý, ale ví, co dělá. Spokojenost.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 22,
      submittedAt: "2026-06-23T18:07:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-23",
    _status: "draft",
    _createdAt: "2026-06-27T09:52:00.000Z",
    _updatedAt: "2026-06-28T07:44:00.000Z",
    data: {
      customerName: "Vojtěch Ambrož",
      consultantName: "Jane Doe",
      message:
        "Přišel jsem s tím, že chci zrušit penzijko, a odcházel jsem s tím, že si ho nechám a jen změním strategii. Bylo mi vysvětleno proč, včetně čísel. Ocenil bych rychlejší odpovědi na e-maily.",
      hashtag: "poradce",
      approved: false,
      likes: 2,
      order: 23,
      submittedAt: "2026-06-27T09:52:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-24",
    _status: "draft",
    _createdAt: "2026-07-01T13:19:00.000Z",
    _updatedAt: "2026-07-01T13:19:00.000Z",
    data: {
      customerName: "Kristýna Bártová",
      consultantName: "Layla Doe",
      message:
        "Do programu jsem se přihlásila přes firmu, kde pracuji, a čekala jsem něco formálního na dvacet minut. Nakonec jsme seděli hodinu a půl a probrali věci, o kterých se mi doma s nikým mluvit nechce, třeba co by se stalo, kdybych já nemohla pracovat a zůstala na děti sama. Pan Kříž mi z toho udělal jednoduchý přehled, kolik bych potřebovala a kolik z toho už mám pokryté. Nic jsem hned nepodepisovala, dostala jsem to na papíře domů. Vrátila jsem se za tři týdny a uzavřeli jsme jednu smlouvu místo tří, které jsem měla předtím.",
      hashtag: "benefitprogram",
      approved: false,
      likes: 0,
      order: 24,
      submittedAt: "2026-07-01T13:19:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-25",
    _status: "draft",
    _createdAt: "2026-07-04T16:45:00.000Z",
    _updatedAt: "2026-07-04T16:45:00.000Z",
    data: {
      customerName: "Roman Vlček",
      consultantName: "Michaela Veselá",
      message:
        "Stavební spoření pro dceru jsme řešili během jedné návštěvy a paní Veselá nám k tomu poslala i srovnání, které jsme si nevyžádali. Je vidět, že v tom má pořádek, i když je v týmu krátce.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 25,
      submittedAt: "2026-07-04T16:45:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-26",
    _status: "draft",
    _createdAt: "2026-07-08T08:31:00.000Z",
    _updatedAt: "2026-07-08T08:31:00.000Z",
    data: {
      customerName: "Lenka Procházková",
      consultantName: "Václav Procházka",
      message: "Nejlepší poradce, kterého jsme kdy měli.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 26,
      submittedAt: "2026-07-08T08:31:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-27",
    _status: "draft",
    _createdAt: "2026-07-11T02:14:00.000Z",
    _updatedAt: "2026-07-11T02:14:00.000Z",
    data: {
      customerName: "Investice AI Bot",
      consultantName: "Michaela Marková",
      message:
        "Vydělávejte 3000 Kč denně z domova jen s mobilem! Náš robot obchoduje za vás, výnos 40 % měsíčně garantován. Registrace zdarma na kryptozisk-cz.example.net, prvních 100 lidí dostane bonus.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 27,
      submittedAt: "2026-07-11T02:14:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-28",
    _status: "draft",
    _createdAt: "2026-07-15T12:03:00.000Z",
    _updatedAt: "2026-07-15T12:03:00.000Z",
    data: {
      customerName: "Adéla Nová",
      consultantName: "Ondřej Efenberk",
      message:
        "Zdědila jsem po babičce byt a peníze na účtu a vůbec jsem nevěděla, co s tím. Bála jsem se, že mi někdo doporučí něco, čemu nebudu rozumět, a že to podepíšu jen proto, abych vypadala rozumně. Paní Svobodová mi nejdřív řekla, ať tři měsíce neděláme nic, a to mě zarazilo nejvíc, protože z toho nic neměla. Za tu dobu jsme si dvakrát sedly a probraly, co od peněz vlastně chci. Nakonec jsme část nechaly na spořicím účtu jako rezervu a zbytek rozdělily do fondů. Rok a půl to běží přesně tak, jak jsme si řekly.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 28,
      submittedAt: "2026-07-15T12:03:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-29",
    _status: "draft",
    _createdAt: "2026-07-19T19:26:00.000Z",
    _updatedAt: "2026-07-20T09:08:00.000Z",
    data: {
      customerName: "Štěpán Holub",
      consultantName: "Tereza Posnerová",
      message:
        "Jako živnostník jsem měl v papírech nepořádek a pojištění odpovědnosti žádné. Za dvě schůzky jsme to dali dohromady a mám i rezervu, na kterou si nesahám. Škoda, že jsem to neřešil dřív.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 29,
      submittedAt: "2026-07-19T19:26:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-30",
    _status: "draft",
    _createdAt: "2026-07-23T10:12:00.000Z",
    _updatedAt: "2026-07-23T10:12:00.000Z",
    data: {
      customerName: "Monika Čermáková",
      consultantName: "Tereza Marková",
      message: "Hypotéku jsme měli schválenou za tři týdny.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 30,
      submittedAt: "2026-07-23T10:12:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-31",
    _status: "draft",
    _createdAt: "2026-07-27T14:55:00.000Z",
    _updatedAt: "2026-07-27T14:55:00.000Z",
    data: {
      customerName: "Tomáš Bureš",
      consultantName: "Olga Kaslová",
      message:
        "Přišel jsem s tabulkou vlastních výpočtů, protože jsem si myslel, že tomu rozumím líp než většina poradců. Pan Beneš si ji vzal, prošel ji řádek po řádku a na dvou místech mi ukázal chybu, kterou jsem tam táhl roky, konkrétně jsem počítal s výnosem po zdanění, ale zapomínal na poplatky za správu. Nedělal z toho vítězství, jen to opravil a poslal mi vlastní verzi. Od té doby se scházíme jednou za rok, spíš kvůli kontrole než kvůli změnám. Tohle je přesně ten typ spolupráce, který jsem hledal.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 31,
      submittedAt: "2026-07-27T14:55:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-32",
    _status: "draft",
    _createdAt: "2026-07-31T09:38:00.000Z",
    _updatedAt: "2026-07-31T09:38:00.000Z",
    data: {
      customerName: "Klára Havlíčková",
      consultantName: "Lukáš Matouš",
      message:
        "Chtěla jsem jen spořicí účet pro dceru a odešla jsem s celým plánem na deset let. Nebyl to tlak, spíš mi došlo, kolik věcí jsem odkládala. Sedmnáct let jsem neměla nic a teď mám pořádek.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 32,
      submittedAt: "2026-07-31T09:38:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-33",
    _status: "draft",
    _createdAt: "2026-08-03T17:21:00.000Z",
    _updatedAt: "2026-08-03T17:21:00.000Z",
    data: {
      customerName: "Jiří Souček",
      consultantName: "Benefit Program",
      message:
        "Program u nás ve firmě běží druhý rok a využila ho asi polovina lidí z dílny. Nikdo nikoho nenutil, kdo nechtěl, nemusel přijít. Kolegům se to líbí hlavně kvůli tomu, že je to zdarma.",
      hashtag: "benefitprogram",
      approved: false,
      likes: 0,
      order: 33,
      submittedAt: "2026-08-03T17:21:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-34",
    _status: "draft",
    _createdAt: "2026-08-06T11:09:00.000Z",
    _updatedAt: "2026-08-06T11:09:00.000Z",
    data: {
      customerName: "Eliška Ryšavá",
      consultantName: "Lukáš Vituj",
      message:
        "Manžel zemřel loni v zimě a k zármutku se přidalo, že jsem netušila, co všechno máme sjednané a kde to hledat. Paní Horáková přijela druhý den, sesbírala smlouvy a postupně mi vysvětlovala, co znamenají a co je potřeba udělat jako první. Pomohla mi s uplatněním plnění, s převodem hypotéky i s tím, co říct na úřadu. Nikdy nespěchala a nikdy mi nic neprodávala, i když bych v tom stavu podepsala cokoliv. Teprve po půl roce jsme se bavily o mém vlastním zajištění. Za tenhle přístup jí budu vděčná napořád.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 34,
      submittedAt: "2026-08-06T11:09:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-35",
    _status: "draft",
    _createdAt: "2026-08-10T08:44:00.000Z",
    _updatedAt: "2026-08-10T08:44:00.000Z",
    data: {
      customerName: "Dominik Slavík",
      consultantName: "Jakub Šimek",
      message: "Vše na jedničku, děkuji za trpělivost.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 35,
      submittedAt: "2026-08-10T08:44:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-36",
    _status: "draft",
    _createdAt: "2026-08-13T15:32:00.000Z",
    _updatedAt: "2026-08-13T15:32:00.000Z",
    data: {
      customerName: "Renata Marešová",
      consultantName: "Jane Doe",
      message:
        "Sešly jsme se kvůli penzi a nakonec jsme řešily hlavně to, jestli si můžeme dovolit rekonstrukci. Odpověď byla ano, ale o rok později. Radši slyším pravdu než hezky znějící čísla.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 36,
      submittedAt: "2026-08-13T15:32:00.000Z",
      source: "web",
    },
  },
  {
    _id: "review-37",
    _status: "draft",
    _createdAt: "2026-08-17T09:57:00.000Z",
    _updatedAt: "2026-08-17T09:57:00.000Z",
    data: {
      customerName: "Ladislav Hruška",
      consultantName: "Layla Doe",
      message:
        "Recenzi diktoval klient telefonicky, protože nechtěl psát na počítači. Spolupráce prý trvá tři roky, naposledy jsme řešili pojištění chalupy a převod penzijka. Vzkazuje, že je spokojený a že už nikam jinam nepůjde.",
      hashtag: "poradce",
      approved: false,
      likes: 0,
      order: 37,
      submittedAt: "2026-08-17T09:57:00.000Z",
      source: "studio",
    },
  },
]

export const seedDocuments = { review, consultant, partner, offer, qna, siteCopy }



/* ------------------------------------------------------------------ users -- */
/* Fixture accounts for the dev port. The password is in plain sight because
   this file is a browser fixture that never ships — `src/pages/studio` mounts
   the dev port only behind NEXT_PUBLIC_CMS_DEV_PORT=1, and the real port keeps
   nothing but a scrypt hash. */

export const DEV_PASSWORD = "studio-dev-heslo"

export const seedUsers = [
  {
    id: "user-1",
    email: "redakce@prochazkagroup.cz",
    name: "Redakce",
    role: "owner",
    password: DEV_PASSWORD,
    createdAt: "2025-11-04T08:00:00.000Z",
    lastLoginAt: "2026-08-19T07:41:00.000Z",
    disabledAt: null,
  },
  {
    id: "user-2",
    email: "lucie.novakova@prochazkagroup.cz",
    name: "Bc. Lucie Nováková",
    role: "editor",
    password: DEV_PASSWORD,
    createdAt: "2026-01-12T10:20:00.000Z",
    lastLoginAt: "2026-08-18T15:02:00.000Z",
    disabledAt: null,
  },
  {
    id: "user-3",
    email: "tomas.dvorak@prochazkagroup.cz",
    name: "Tomáš Dvořák",
    role: "editor",
    password: DEV_PASSWORD,
    createdAt: "2026-03-02T09:15:00.000Z",
    lastLoginAt: null,
    disabledAt: null,
  },
  {
    id: "user-4",
    email: "michaela.vesela@prochazkagroup.cz",
    name: "Michaela Veselá",
    role: "editor",
    password: DEV_PASSWORD,
    createdAt: "2026-04-18T11:48:00.000Z",
    lastLoginAt: "2026-05-30T08:26:00.000Z",
    disabledAt: "2026-07-01T09:00:00.000Z",
  },
]

/** The account the dev port signs in as by default. */
export const seedUser = seedUsers[0]
