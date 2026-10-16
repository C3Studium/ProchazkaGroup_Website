# What is clickable, and what happens — the second round

`EDIT-MODE.md` built the mode: `/studio/edit`, the overlay mounted from the
host, a control that anchors bottom-right, in-place text editing, saving to
`draft`. This states what that mode still has to learn. Four builds share it.

## The ask, in the words it arrived in

> potřebuju že se dá kliknout na ten text atd. a upravit ho rovnou … zobrazit
> vpravo dole tlačítko upravit a highlightovat ten component na který jsem
> klikl, a potom když se něco změní dole vpravo vyměnit ty buttony za uložit
> nebo zrušit, a potom nahoře se dá tlačítko publikovat, pro obrázky tam
> vyskočí pop up po tom co se highlightuje ten component s obrázkem, a dát tam
> pop up kde se dá nahrát nový obrázek, nebo set obrázků, dle komponentu.
>
> pro partnery, slevy a poradce to ukáže ten stejný pop up který je v jejich
> nativní stránce. Pro buttony to ukáže jen změnu textu pokud to je link na té
> stránce, a pro linky které jsou na jiné stránky kromě toho linku pro C3
> studium, tak se dá změnit jak jméno tak link, pokud je to ikona tak jen link.
>
> pro tu stránku tedy musíš dát disable myš interakce pokud jdou upravovat
> content, a když kliknou na tlačítko náhled tak se jim uloží draft a budou si
> to moct prohlédnout i s mouse animacemi.

## Contract A′ — the annotation, extended

Four helpers, one attribute set. `editable()` keeps its signature; the rest are
new and live beside it in `@/cms/edit`.

```js
editable(doc, field, kind, mark)      // kind: "text" | "image"   — unchanged
editableSet(doc, field)               // an array-of-images field
editableDoc(doc, type)                // the whole document, as a form
editableLink(doc, { text, href })     // a link or a button
```

| attribute | carried by | meaning |
|---|---|---|
| `data-cms-doc` | all | document id |
| `data-cms-kind` | all | `text` `image` `imageSet` `document` `link` |
| `data-cms-field` | text, image, imageSet, link | field path |
| `data-cms-href` | link | field path of the href, when it is editable |
| `data-cms-type` | document | content type name, so the popup can find the schema |
| `data-cms-mark` | text | emphasis mark, optional — see `schemas/marks.js` |

**The link's three shapes are decided by which fields are passed, not by a
fourth attribute.** A link that goes somewhere on the same page gets `text`
only. A link to another page gets `text` and `href`. An icon has no text to
edit, so it gets `href` only. The overlay reads the attributes and offers
exactly what is there — there is no mode to get wrong, because the annotation
*is* the mode.

**Never annotate `MyButton`** (`components/common/ui/stickyButtons/buttons/MyButton`,
"Kód od C3 Studium" → `matejforejt.com`). It is the developer's own credit, not
the client's content, and it is the one link named in the ask as out of scope.
State this in the component so nobody adds it later.

Everything already true of `editable()` stays true: outside edit mode every
helper returns `{}`, attributes are emitted from an effect so no server render
carries them, and nothing under `overlay/` may become reachable from a public
route.

## Contract D — what each kind does when clicked

Every kind shares the first two steps: **hover outlines, click selects and holds
the outline**, with the control anchored bottom-right (`overlay/anchor.js` —
built, tested, do not rewrite).

| kind | taking *Upravit* | committing |
|---|---|---|
| `text` | the element becomes editable in place | *Uložit* / *Zrušit* replace *Upravit* **as soon as the value differs** |
| `image` | popup over the page: pick from the library, **upload a new file**, edit alt, remove | inside the popup |
| `imageSet` | the same popup, over the whole set: add, replace one, reorder if the field is ordered, remove | inside the popup |
| `document` | popup rendering **the type's own form** — the same `FieldRenderer` the Studio's document editor uses | inside the popup |
| `link` | text in place if `data-cms-field`; an href input if `data-cms-href`; both if both | *Uložit* / *Zrušit* |

**The button swap is driven by change, not by mode.** *Upravit* becomes
*Uložit* / *Zrušit* when the value actually differs from what was stored, and
goes back when it matches again. An editor who opens a field and types nothing
has nothing to save and should not be asked to.

**One popup component, not four.** `image`, `imageSet` and `document` are the
same overlay affordance with different bodies. The bodies are existing Studio
components (`MediaLibrary`, `FieldRenderer`) — copying either into the overlay
produces a second one that is right on the day it is written and wrong after.

## The interaction lock

While editing is armed, **the framed page must not respond to its own pointer
interactions.** This site is full of them: magnetic buttons, a custom cursor,
hover reveals, `Link`s that navigate. A click meant to select an element must
not also follow a link or fire a magnet.

- Block pointer and mouse events in the **capture** phase at the frame's
  document, before the page's own listeners see them. The overlay's own chrome
  is exempt.
- **Scrolling stays.** The page is 550vh in places and an editor has to reach
  the bottom of it. Wheel, touch scroll and keyboard scrolling are not pointer
  interactions and are not blocked.
- Text selection inside the element being edited stays, obviously.
- The lock belongs to the overlay's lifetime. If the overlay is not mounted,
  nothing is blocked — that is what keeps `/studio/preview` honest.

## Náhled — the way to see it move

A control in the top bar. Taking it:

1. **Commits or refuses.** An edit in progress is saved first; if the save
   fails, the toggle does not happen and says why. Nothing may be silently
   dropped on the way to a preview.
2. Releases the lock and takes the overlay down, so the page behaves **exactly
   as it does for a visitor** — cursor, magnets, hovers, all of it.
3. Toggling back re-arms editing on the same page and scroll position.

It is showing the **draft**, and it must say so: the page an editor is looking
at is not yet the page the public gets.

## Publikovat — in the top bar

`EDIT-MODE.md` argued there should be no publish button here, because
publishing is per document and this surface spans several. The ask overrides
that, and the argument was never that it is wrong — only that it is ambiguous.
So resolve the ambiguity instead of dropping it:

- The button publishes **the documents this page's annotations touch that have
  a draft**, and nothing else.
- Before it does anything it **says which blocks will go live**. This is the
  only action in the mode the public can see, and the only one that is not
  undone by *Zrušit*.
- With no drafts on the page there is nothing to publish and the button says so
  rather than being mysteriously inert.

## Blocking, and honest about it — resolved

**Uploading a new file works.** It did not when this was written: the file-backed
store had no object store behind it and `media.upload` refused in words. Build 1
answered that with a second `StoragePort` driver rather than a branch —
`server/ports/fileStorage.js`, bytes under `.cms-dev/media/`, selected by the one
question that already selects the document store (`hasServiceRoleKey()`, read in
`env.js storageDriver()`). `media.js`, the handlers, `MediaLibrary` and the
overlay's picker hold a port and cannot tell which driver they have.

Three things the popup builds should know:

- **The URL is root-relative** — `/api/cms/asset/<key>`, served by
  `pages/api/cms/asset/[...key].js`, unauthenticated so `next/image`'s optimizer
  (which fetches server-side, without cookies) can read it. Both `<img>` and
  `<Image>` were measured working against it.
- **The asset record now carries `filename`** on the real HTTP port, not only in
  the fixtures. `query.js toAsset()` derives it from the key; before that an
  uploaded file arrived in the library and in the image field with a blank name.
- **Type and dimensions come from the bytes**, not from what the client sent
  (`server/imageProbe.js`). An SVG renamed `.webp` is refused with `invalid`, so
  the popup can show the server's sentence and does not need a guess of its own.

## What must still be true afterwards

Regressing any of these is a defect; each was measured, not assumed.

- **0** `data-cms-*` in prerendered public HTML, on every route. Nothing under
  `overlay/` reachable from any public route or from `_app`.
- Every stylesheet under `src/cms` is `*.module.scss`. `sync-styles.js` globs
  every non-module `.scss` under `src/` into the site's public stylesheet.
- 0 console errors and 0 hydration mismatches on `/studio/*` and every framed
  page. Anything read from the URL is gated on an effect — `router.isReady` is
  `true` on a static route's first client render and `false` on the server.
- Writes go to `draft`. `patchField` cannot reach `data`, `status` or
  `published_at`; publishing is the only path to `data` and it is explicit.
- Viewport emulation stays real: `100vh` inside the frame resolves to the
  preset's height, `.HScroll__sticky` flips at the 820px stop.
- No animation, timing or transform value in `src/components/pages/index/`
  changes. Annotation attributes are the permitted edit there.

---

# Round three — coverage, reachability, and the colour

Three findings drove this, all measured rather than reported.

## 1. Four of eleven annotated elements cannot be clicked

Hit-testing the centre of every `[data-cms-doc]` on the homepage inside
`/studio/edit`, and asking what `elementFromPoint` returns:

| kind | field | size | hit lands on | owner |
|---|---|---|---|---|
| image | `image` (WhoWeAre) | 478×539 | `section.WhoWeAre` | **none** |
| image | `image` (Offers) | 461×486 | `div.Offers__photo__slat` | itself |
| text | `items.0.label` (QnaContact) | 119×29 | `div.QnaContact__head` | **none** |
| text | `title` (QnaContact) | 190×34 | `div.QnaContact__head` | **none** |
| text | `items.1.label` (QnaContact) | 194×20 | `div.QnaContact__switch` | **none** |

The point at the middle of the element resolves to an **ancestor**, so walking up
from the hit finds no annotation and the overlay selects nothing. This is why
"clicking an image does nothing": the popup was never the problem, the element
was never found. The Offers photo works, which is why it looked intermittent.

**The fix is in the hit test, not in the annotations.** An annotated element that
is visually present must be selectable whatever is drawn on top of it — a WebGL
canvas, an absolutely-positioned sibling, a child with `pointer-events: none`.
`Overlay.jsx` already has a geometric sweep behind `elementFromPoint`; it is
evidently not reached or not sufficient. Whatever replaces it must be measured
the same way: **every annotated element on every page, hit-tested, 0 unreachable.**

## 2. Shaders are images with a longer path

`GridDistortion` takes `imageSrc` and paints it on a plane; it is used in **11
places**, including `WhoWeAre`, `HorizontalScroll`, `AboutHero`,
`MemberShowcase`, `ContactModal`, `AdvisorCard`, `History`, `OfferHero`,
`ClipPathPage` and `CircleStack`. `rippleImage` re-exports it.

So a shader needs **no new kind**. What changes is the same thing an `image`
changes — the file the plane samples — so it is annotated `image`, on the element
that owns `imageSrc`, and it gets the image popup. The only thing it needs from
the overlay is to be reachable through the canvas, which is finding 1.

## 3. Coverage: most of the page is not editable

The homepage renders **12** section components; **2** call `editable()`.
`/o-nas` renders **8**; **3** do.

**Everything that is content must be editable** — every heading, paragraph,
label, caption, number, image and shader plane. Two exclusions, both from the
ask:

- **The navbar.** Site navigation is structure, not copy.
- **Buttons whose link is a path on this site.** Their text is editable; their
  target is not, because it is the site's own routing.

`MyButton` (© Design&Code C3 Studium → `matejforejt.com`) stays out entirely, as
before.

Where a section's copy is a fixed-length list that the layout is computed from —
the `01/02/03` ordinals, a card count a seam is measured against — the *text* is
still editable; the *number of items* is not. Say which you found.

## 4. Each kind gets its own popup

`text` edits in place with the control; `image` (and shader), `imageSet`,
`document` and `link` each open a popup shaped for that kind. One shell
(`Popup.jsx`), five bodies. Today the `image` control puts *Nahradit* / *Popis* /
*Odebrat* on the control itself and only *Nahradit* opens anything — that is the
discrepancy to close.

Since round five the `image` popup also carries **Oříznout** — a crop frame over
the picture, applied server-side, rewriting one library row rather than minting a
second. It has one rule worth knowing before using it: **a crop applies where you
applied it**, not everywhere the picture is used. See `MEDIA.md` for why, and for
what a reusable cropped variant would take.

## 5. The selection colour

The outline and control currently borrow `--st-accent`, the Studio's own accent,
and against this site's dark sections it barely reads.

**Selection gets its own token — neon orange `#FF6A00`** — used by the hover
outline, the selection outline and the control's accent. It must **not** be
`--st-accent`: repainting that turns the whole admin orange, and the admin is not
what needed to become more visible.

Verify it, do not eyeball it: measure the outline's contrast ratio against the
darkest and the lightest thing it is drawn over on this site (the hero's near-black
and the white sections). If neon orange fails on one of them, say so and propose
the second colour the ask named — burnt orange `#CC5500` — rather than shipping
something invisible on half the page.

---

# Round four — the homepage, from the client's own list

Reported against `/` with screenshots. Everything here is that page; other pages
follow once these hold.

## The kinds, after this round

| kind | what it is | how it commits |
|---|---|---|
| `text` | one string, edited in place — **now multi-line** | control |
| `lines` | one block backed by an **array of strings**; edited as one, saved per line | control |
| `image` | one file, incl. a shader's plane | popup |
| `imageSet` | a component's several files, reordered by **drag and drop** | popup |
| `list` | an array of objects (a Q&A pair, …) edited whole | popup |
| `document` | a CMS document, as its own form | popup |
| `link` | a label and/or a target | popup |

`data-cms-actions` narrows a popup: `moderate` gives a `document` popup **only**
hide and archive.

## 1. Four reports, one cause: hard line breaks

"Nejde editovat" was reported on the hero `<h1>`, the Benefit-program block,
"Prohlédněte si další recenze" and "Máte nějaký dotaz?". All four are one
element containing `<br />`, and `overlay/text.js` flattens an element to a
single text node built from `textContent` — `textContent` of `A<br>B` is `"AB"`,
so the first save would weld the lines together. The overlay refuses instead,
which is why nothing happens on click.

**Text becomes multi-line.** A break in the stored value survives the round trip,
Enter inserts one rather than committing, and committing moves to the control.
The stored representation is `\n`; `<br>` is how it renders. Nothing may weld.

## 2. The Offers block is edited whole, not line by line

Four `items[].label`s render as four lines and are annotated separately, so an
editor edits one line at a time. It should be **one block**, edited as one —
**and the per-line reveal animation must survive it.** That is the `lines` kind:
the annotation sits on the container, the editor sees the whole block, and the
save writes each line back to its own `items[i].label`. Adding or removing a
line changes the array's length.

## 3. A component with several images is one target, not several

The card deck highlights one photograph at a time. It is **one component with
three sources** and it should open **one popup**: reorder by **drag and drop**,
replace or remove any one, add another. That is `imageSet`, which until now had
no real target — a field of that shape has to exist in the schema first.

## 4. The orbit opens its partners

`OrbitImages` takes bare URL strings, so the fourteen logos carry no identity.
Give it entries that carry one, and a logo opens **that partner's document
popup** — the same form its own page shows. Its position in the ring is
`partner.order`, which that form already edits.

## 5. Reviews are not edited here

Clicking a review must **not** offer editing. A review is a client's words; the
job on this surface is moderation, so its popup offers exactly **hide** and
**archive** and nothing else. `data-cms-actions="moderate"`.

## 6. The FAQ opens as a whole

Clicking a question opens a popup for that **question and its answer together**;
clicking the block beside it opens **the whole array**. One `list` popup, two
entry points.

## 7. Buttons

- **Text is always editable.** Every button, every icon label.
- **Internal targets are not editable.** A path on this site is routing.
- **External targets are editable** — and external buttons carry a class that
  says so, so "is this external" is answered by the markup rather than by
  parsing an href at three call sites.
- **`MyButton` (C3 Studium → matejforejt.com) stays out entirely.** It is the
  developer's own credit. This is the third time it is written down.
- **A button that is not a form submit opens the contact modal** rather than
  navigating — "Spojit se" and its siblings. This is a change to the *site*, not
  to the editor, and it is deliberate: the modal is the conversion path.

## Still true

0 `data-cms-*` in public HTML on every route. Every stylesheet under `src/cms`
is `*.module.scss`. 0 console errors, 0 hydration mismatches. Writes reach
`draft`, never `data`. No animation, timing or transform value in
`src/components/pages/index/` changes — annotation is the permitted edit, and
where a reveal has to survive editing, the reveal wins.

---

# Round five — `/o-nas`, and the two popups it needs

Same treatment as the homepage, plus two things the client named: **a consultant
opens their own popup**, and **contact opens the contact modal, where the
assistant opens hers**.

## Where the page actually stands

Measured in `/studio/edit`, after scrolling the whole page so the lazy sections
mount:

```
72 annotated   text 52 · link 12 · image 8 · document 0
4 elements hold a <br/>, 0 of them annotated
5 external links carry no isExternal class
```

`/o-nas` renders **six** components: `AboutHero`, `MemberShowcase`, `Colleagues`,
`ContinuePrompt`, `History`, and `QnaContact` (only once the history opens).
`aboutTeam` and `about` are not imported and not rendered — their links do not
count.

Everything the homepage gained is available here: multi-line `text`, `lines`,
`list`, `imageSet`, `document` with `data-cms-actions`, `editableLink`, and the
`isExternal` class in `components/common/ui/externalLink.js`.

## 1. The consultants — the decision that was deferred

The roster in `Colleagues` comes from `src/constants/people.js` (**10** people,
keyed by position: names, portraits, telephones, and ten `MOTTOS`). The CMS holds
**13** consultants. The previous round deliberately left this alone, because
reading the CMS changes *who is on the page*, which the acceptance test forbids.

The client has now asked for a consultant to open their own popup, which means
the roster has to carry document ids, which means it comes from the CMS.

**The page must still look identical: the same ten people, in the same order,
with the same portraits and telephone numbers.** The other three stay in the
Studio and off the page. Say exactly how you kept the ten — order field, active
flag, or archive — and what happens when someone adds an eleventh.

`editableDoc(consultant)` then replaces the per-field text annotations on a
person: a name, a motto and a portrait are fields of one document, and the popup
is that document's own form — the same argument that already applies to
partners, offers and reviews.

## 2. Contact opens the modal; the assistant opens her own popup

`assistant` is a registered content type and `ContactModal` already carries
`editableDoc(assistant?.id, "assistant")`. What is unverified is whether the
popup opens, whether it is her form, and whether everything else in the sheet is
editable — my survey never opened the modal.

The homepage already reroutes five non-form buttons to the sheet
(`components/common/ContactModal/open.js`, `aria-haspopup="dialog"`, the `href`
kept as a no-JS fallback). Do the same here, and list every button you did and
did not reroute, with the reason.

## 3. The four hand-broken elements

Same cause as the homepage's four, and the fix now exists: a break is `\n` in the
store and `<br />` on the page, `Lines` in `components/common/ui/lines.jsx` draws
it, and the `headline` field on `siteCopy` holds it. Annotate them.

Note the trap that cost the homepage a round: the four homepage blocks were
seeded with `headline` in `data` but an **empty string in `draft`**, so the
surface was editable and was editing a value that had never been stored. Check
`draft` as well as `data` for anything you seed.

## 4. The rest

- **5 external links** gain `isExternal` and an editable target: `AboutHero`'s
  badge and `Colleagues`' mail, Facebook and Instagram icons.
- **Buttons**: text always editable, internal targets never, external always,
  `MyButton` never.
- **`History`'s four shader photographs** are already `image`; check whether the
  four panels want to be a `list` instead, and say what you concluded.
- The footer computes `display: none` on this page, so its 13 annotations are
  dead here and reachable on every other page. Do not "fix" it by changing the
  footer; just do not count them.

## Still true

0 `data-cms-*` in public HTML. Every stylesheet under `src/cms` is
`*.module.scss`. 0 console errors, 0 hydration mismatches. Writes reach `draft`,
never `data`. The rendered page — text and every image URL — is identical before
and after, and that is the acceptance test.
