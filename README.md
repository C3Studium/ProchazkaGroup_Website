# Procházka Group

**[www.prochazkagroup.cz](https://www.prochazkagroup.cz/)** · [Česky](#česky) · [English](#english)

---

## Česky

Web finančně poradenské kanceláře Procházka Group z Písku (součást OVB Allfinanz). Navržený
a postavený na míru, bez šablon a page builderů — včetně vlastního redakčního systému **Studio**,
ve kterém kancelář spravuje celý obsah webu sama.

### Co na webu je

- **Hlavní stránka** — úvodní scéna, kdo jsme, nabídka, recenze, výběr poradce a kontaktní formulář.
- **O nás** — příběh týmu, kolegové a historie systému OVB na mapě Evropy.
- **Nabídka** — proč finanční plán, statistiky domácností, co pro klienty řešíme.
- **Partneři** — slevy u partnerů jen pro klienty kanceláře.
- **Benefit program** — doporučení a odměny ve čtyřech úrovních.
- **Recenze** — zeď recenzí a karta každého poradce (`/recenze/<poradce>`), na kterou vede QR kód
  z vizitky. Recenze se před zveřejněním schvalují ve Studiu.
- **Kontaktní okno** — otevírá se z navigace na každé stránce, kontakt na asistentku kanceláře.

### Zážitek

- Shaderový podklad (three.js / React Three Fiber) pod celým webem, s adaptivní kvalitou podle výkonu.
- Úvodní opona při první návštěvě — ukáže se jednou za hodinu (cookie `pg_intro`); tvrdé obnovení
  (Ctrl/Cmd + Shift + R) ji pustí znovu.
- Scrollem řízené sekce (Framer Motion, Lenis), přechody mezi stránkami, mřížka pod kurzorem,
  fotky deformované v blocích pod ukazatelem (WebGL).
- **Omezený pohyb** (`prefers-reduced-motion`): podklad se zastaví na jednom snímku a fotky jsou
  obyčejné obrázky bez shaderu.
- Ovládání z klávesnice, správné popisky pro čtečky obrazovky, viditelný fokus jen při ovládání
  klávesnicí.

### Studio (redakční systém)

Vlastní CMS na adrese `/studio`, přihlášení heslem a role (majitel, správce, člen).

- **Upravit kontent** — editace přímo v náhledu stránky: klik na text a psaní, klik na obrázek a výměna.
- **Schvalování recenzí**, poradci, asistentka, partneři, časté dotazy, novinky a všechny texty webu.
- **Koncept a publikace**, archiv verzí a náhled webu v několika velikostech obrazovky.
- **Knihovna médií** — nahrané obrázky se automaticky zmenší a převedou do WebP.
- Kontakt na asistentku (telefon, e-mail) je jeden záznam — web ho používá v patičce, v kontaktním
  okně, u výběru poradce i ve strukturovaných datech pro Google.

### Technologie

Next.js 16 (Pages Router) · React 19 · JavaScript · SCSS s vlastním responzivním systémem ·
Framer Motion · Lenis · three.js / React Three Fiber · OGL · GSAP · PostgreSQL (Supabase) ·
Resend + React Email · Vercel.

Měření (GTM, GA4, Clarity) se načte až po souhlasu s analytickými cookies. Písma (Switzer, Synonym,
Poppins, Roboto Flex) jsou hostovaná na vlastní doméně. Každá stránka má vlastní titulek, popis,
kanonickou adresu, Open Graph a strukturovaná data Schema.org.

### Spuštění

```bash
pnpm install
pnpm dev        # http://localhost:3000, Studio na /studio
pnpm build
pnpm start
```

Potřebuje soubor `.env` s přístupem k databázi (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), prvním účtem do Studia
(`CMS_ADMIN_EMAIL`, `CMS_ADMIN_PASSWORD`, `CMS_SESSION_SECRET`) a odesíláním e-mailů
(`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).

---

## English

The website of Procházka Group, a financial advisory office in Písek, Czech Republic (part of
OVB Allfinanz). Designed and built from scratch — no templates, no page builders — including a
custom content management system, **Studio**, in which the office runs all of the site's content
itself. All site content is in Czech.

### What's on the site

- **Home** — opening scene, who we are, services, reviews, choosing an advisor and a contact form.
- **About** — the team's story, colleagues, and the history of the OVB system on a map of Europe.
- **Services** — why a financial plan, household statistics, what we take care of for clients.
- **Partners** — partner discounts reserved for the office's clients.
- **Benefit program** — referrals and rewards across four tiers.
- **Reviews** — a review wall plus a page for every advisor (`/recenze/<advisor>`) that the QR code
  on their business card opens. Reviews are moderated in Studio before they go live.
- **Contact sheet** — opens from the navigation on every page, addressed to the office assistant.

### Experience

- A shader background (three.js / React Three Fiber) under the whole site, with adaptive quality.
- An opening curtain on the first visit — shown once an hour (`pg_intro` cookie); a hard reload
  (Ctrl/Cmd + Shift + R) plays it again.
- Scroll-driven sections (Framer Motion, Lenis), page transitions, a cursor-lit grid, and photos
  that break into blocks under the pointer (WebGL).
- **Reduced motion** (`prefers-reduced-motion`): the background freezes on a single frame and photos
  become plain images without the shader.
- Keyboard operable, proper screen-reader labels, and a focus ring shown only for keyboard use.

### Studio (CMS)

A custom CMS at `/studio`, with password sign-in and roles (owner, admin, member).

- **Edit content** — editing directly inside the page preview: click a text and type, click an
  image and replace it.
- **Review moderation**, advisors, the assistant, partners, FAQ, news, and every text on the site.
- **Draft and publish**, a version archive, and a site preview at several screen sizes.
- **Media library** — uploaded images are automatically resized and converted to WebP.
- The assistant's contact details (phone, e-mail) are a single record — the site uses it in the
  footer, the contact sheet, the advisor picker and the structured data for search engines.

### Stack

Next.js 16 (Pages Router) · React 19 · JavaScript · SCSS with a custom responsive system ·
Framer Motion · Lenis · three.js / React Three Fiber · OGL · GSAP · PostgreSQL (Supabase) ·
Resend + React Email · Vercel.

Analytics (GTM, GA4, Clarity) load only after consent to analytics cookies. Fonts (Switzer,
Synonym, Poppins, Roboto Flex) are self-hosted. Every page has its own title, description,
canonical URL, Open Graph tags and Schema.org structured data.

### Running locally

```bash
pnpm install
pnpm dev        # http://localhost:3000, Studio at /studio
pnpm build
pnpm start
```

Requires a `.env` with database access (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), the first Studio account
(`CMS_ADMIN_EMAIL`, `CMS_ADMIN_PASSWORD`, `CMS_SESSION_SECRET`) and e-mail sending
(`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).

---

Design & development: [Matěj Forejt](https://matejforejt.com) · Code under the MIT license —
client content, photography and branding are not.
