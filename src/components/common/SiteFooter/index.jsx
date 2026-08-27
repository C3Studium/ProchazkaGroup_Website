import Link from "next/link";
import { motion } from "framer-motion";
import Arrow from "@/components/common/ui/Arrow";
import TextPressure from "@/components/common/ui/TextPressure";
import { ENTERS, RISE, group } from "@/components/common/ui/entrance";
import { RiMapPinLine } from "@remixicon/react";
import { CONTACT_TRIGGER } from "@/components/common/ContactModal/open";
import { externalClass } from "@/components/common/ui/externalLink";
import { editable, editableLink } from "@/cms/edit";

// The patička's single-line copy comes from the CMS (siteCopy "global.footer" —
// see @/cms/server/site/footer). These are the values it shipped with and what
// it falls back to; a page that hands down nothing renders exactly this.
//
// The non-breaking spaces are load-bearing and are why these lines are read as
// `title` / `items[].label` rather than through `plainText()`, whose `\s+`
// matches U+00A0 and would turn each one into an ordinary space.
const FALLBACK = {
    where: "Kde nás\u00a0 najdete",
    contactLead: "Kontakt\u00a0| 8-16",
    address: "Smetanova 78/1, 39701 Písek\u00a0 |",
    legal: "2024 © ProcházkaGroup Všechna práva udělena",
};

// The left half of the top row — "global.footer.claim", a block of its own
// because it is the half set with hard line breaks and every one of its lines
// has to be an element before it can be clicked. CLAIM_LINES in
// @/cms/server/site/footer names the positions this file spells as literals.
const FALLBACK_CLAIM = {
    lines: ["Jsme odhodláni vám zlehčit", "finanční aspekt života."],
    cta: ["Kdykoliv jste připraveni,", "my jsme taky."],
    // The button beside them. /kontakt is a path on this site: its words are the
    // editor's and its target is the site's own routing.
    button: "Spojit",
};

// The four links out — "global.footer.links". All four print their own words as
// well as going somewhere, so both halves are editable on all four.
const FALLBACK_LINKS = {
    telephone: { text: "+420 777 898 157", href: "tel:+420777898157" },
    email: { text: "ovb.asistenka@ovbmail.cz", href: "mailto:ovb.asistenka@ovbmail.cz" },
    facebook: { text: "Facebook", href: "https://www.facebook.com/prochazka.group" },
    instagram: { text: "Instagram", href: "https://www.instagram.com/prochazka.group/" },
};

/** The stored line if there is one, the shipped one otherwise. */
const mergeLines = (from, fallback) =>
    fallback.map((line, index) => (from?.[index]?.trim() ? from[index].trim() : line));

/** Both halves of one link, each falling back on its own. */
const mergeLink = (from, fallback) => ({
    text: from?.text?.trim() ? from.text.trim() : fallback.text,
    href: from?.href?.trim() ? from.href.trim() : fallback.href,
});

const Corners = () => (
    <>
        <span className="corner corner--tl" />
        <span className="corner corner--tr" />
        <span className="corner corner--bl" />
        <span className="corner corner--br" />
    </>
);

// The two halves of the top row, a beat apart, and the wordmark and the small
// print behind them.
const TOP = group(0.05);
const CLAIM = group(0.05);
const CONTACT = group(0.16);

// Sticky reveal footer (technique: blog.olivierlarose.com/tutorials/sticky-footer,
// variation 2 — sticky + clip-path, pure CSS so it works on every page).
// The outer box holds 60vh of flow; the inner sticky panel is revealed through
// the clip window as the page scrolls to the bottom.
//
// `docId` is the block the copy came from and arrives only inside the Studio's
// editing frame, through `pageProps.footer` — see @/cms/server/site/footer for
// why a component `_app` renders cannot fetch for itself.
//
// Everything on the patička is annotated now except two things, and both are
// deliberate:
//
//   the wordmark  is the company's name set per character by TextPressure, which
//       measures and scales each letter off its own ref. The in-place editor
//       replaces an element's children with a single text node while it is being
//       typed into, so annotating it would take that layout apart for the
//       duration of every edit. It is the company's name, not a line of copy
//   "© Design&Code C3IStudium"  is the developer's own credit, out of scope on
//       exactly the terms MyButton is
//
// The claim and its call to action WERE out, for a reason that still holds: the
// in-place editor is single-line and stores `textContent`, where a <br> is
// nothing at all, so an element holding a hard break would have its two lines
// welded together on the first save. What changed is where the break lives —
// each line is now its own <span> with the <br /> between the spans rather than
// inside one, so no annotated element holds a break. The spans are bare and
// inline and no rule in this stylesheet selects on `span`.
//
// The `items.N.label` paths below are positions in the block's list, and the
// names for those positions are FOOTER_LINES in @/cms/server/site/footer. They
// are spelled as literals here because that module is server-only and this
// component is on every public route; change one and change the other.
export default function SiteFooter({ where, contactLead, address, legal, claim: cmsClaim, links: cmsLinks, docId }) {
    const copy = {
        where: where?.trim() ? where : FALLBACK.where,
        contactLead: contactLead?.trim() ? contactLead : FALLBACK.contactLead,
        address: address?.trim() ? address : FALLBACK.address,
        legal: legal?.trim() ? legal : FALLBACK.legal,
    };

    const claim = {
        lines: mergeLines(cmsClaim?.lines, FALLBACK_CLAIM.lines),
        cta: mergeLines(cmsClaim?.cta, FALLBACK_CLAIM.cta),
        button: cmsClaim?.button?.trim() ? cmsClaim.button.trim() : FALLBACK_CLAIM.button,
    };
    const claimDocId = cmsClaim?.docId;

    const links = {
        telephone: mergeLink(cmsLinks?.telephone, FALLBACK_LINKS.telephone),
        email: mergeLink(cmsLinks?.email, FALLBACK_LINKS.email),
        facebook: mergeLink(cmsLinks?.facebook, FALLBACK_LINKS.facebook),
        instagram: mergeLink(cmsLinks?.instagram, FALLBACK_LINKS.instagram),
    };
    const linksDocId = cmsLinks?.docId;

    return (
        <footer className="SiteFooter">
            <div className="SiteFooter__scroller">
                <motion.div
                    className="SiteFooter__inner"
                    initial="hidden"
                    whileInView="shown"
                    viewport={ENTERS}
                >

                    <motion.div className="SiteFooter__top" variants={TOP}>
                        <motion.div className="SiteFooter__claim" variants={CLAIM}>
                            <motion.h2 variants={RISE}>
                                {claim.lines.map((line, index) => (
                                    <span key={index}>
                                        {index > 0 && <br />}
                                        <span {...editable(claimDocId, `items.${index}.label`, "text")}>{line}</span>
                                    </span>
                                ))}
                            </motion.h2>
                            <motion.div className="SiteFooter__claim__divider" variants={RISE} />
                            <motion.div className="SiteFooter__claim__cta" variants={RISE}>
                                {/* CLAIM_LINES.ctaFrom is 2 — the two lines of
                                    the claim above come first in the same list. */}
                                <p>
                                    {claim.cta.map((line, index) => (
                                        <span key={index}>
                                            {index > 0 && <br />}
                                            <span {...editable(claimDocId, `items.${2 + index}.label`, "text")}>{line}</span>
                                        </span>
                                    ))}
                                </p>
                                {/* Words only, and no target to edit: this opens
                                    the contact sheet rather than going to
                                    /kontakt, which is a route with nothing on it
                                    but this patička. The href stays as the
                                    no-JavaScript fallback. */}
                                <Link
                                    {...editableLink(claimDocId, { text: "items.4.label" })}
                                    href="/kontakt"
                                    className="SiteFooter__btn"
                                    data-cursor="frame"
                                    {...CONTACT_TRIGGER}
                                >
                                    <Corners />
                                    {claim.button}
                                    <span className="arrow"><Arrow direction="upRight" /></span>
                                </Link>
                            </motion.div>
                            <motion.div className="SiteFooter__claim__divider" variants={RISE} />
                        </motion.div>

                        <motion.div className="SiteFooter__contact" variants={CONTACT}>
                            <motion.div className="SiteFooter__contact__row" variants={RISE}>
                                <span
                                    {...editable(docId, "items.0.label", "text")}
                                    className="lead"
                                >
                                    {copy.contactLead}
                                </span>
                                {/* Both halves on all four links below — these
                                    print their own target as their words, so a
                                    text edit that could not move the href would
                                    make the page lie. `items.N.*` is
                                    FOOTER_LINKS in @/cms/server/site/footer.
                                    All four leave the site and say so, and the
                                    two the CMS could retarget derive the marker
                                    from the href they actually render. */}
                                <span className="details">
                                    <a
                                        {...editableLink(linksDocId, { text: "items.0.label", href: "items.0.value" })}
                                        href={links.telephone.href}
                                        className={externalClass(links.telephone.href) || undefined}
                                        data-cursor="frame"
                                    >
                                        {links.telephone.text}
                                    </a>
                                    <a
                                        {...editableLink(linksDocId, { text: "items.1.label", href: "items.1.value" })}
                                        href={links.email.href}
                                        className={externalClass(links.email.href) || undefined}
                                        data-cursor="frame"
                                    >
                                        {links.email.text}
                                    </a>
                                </span>
                            </motion.div>
                            <motion.div className="SiteFooter__contact__divider" variants={RISE} />

                            <motion.div className="SiteFooter__contact__where" variants={RISE}>
                                <h3 {...editable(docId, "title", "text")}>{copy.where}</h3>
                                <span className="pin"><RiMapPinLine size={26} /></span>
                            </motion.div>
                            <motion.p
                                {...editable(docId, "items.1.label", "text")}
                                className="SiteFooter__contact__address"
                                variants={RISE}
                            >
                                {copy.address}
                            </motion.p>
                            <motion.div className="SiteFooter__contact__divider" variants={RISE} />

                            <motion.div className="SiteFooter__socials" variants={RISE}>
                                <a
                                    {...editableLink(linksDocId, { text: "items.2.label", href: "items.2.value" })}
                                    href={links.facebook.href}
                                    className={["SiteFooter__btn", externalClass(links.facebook.href)].filter(Boolean).join(" ")}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-cursor="frame"
                                >
                                    <Corners />
                                    {links.facebook.text}
                                </a>
                                <a
                                    {...editableLink(linksDocId, { text: "items.3.label", href: "items.3.value" })}
                                    href={links.instagram.href}
                                    className={["SiteFooter__btn", externalClass(links.instagram.href)].filter(Boolean).join(" ")}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-cursor="frame"
                                >
                                    <Corners />
                                    {links.instagram.text}
                                </a>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* The name, set in the variable cut so each letter can
                        answer the pointer on its own. It is a `data-cursor`
                        target as well, so the cursor's marks close on it —
                        the one place on the page where the wordmark is
                        something you can push at rather than just read. */}
                    <motion.div className="SiteFooter__wordmark" variants={RISE} data-cursor="frame">
                        <TextPressure text="Procházka Group" />
                    </motion.div>

                    <motion.div className="SiteFooter__legal" variants={RISE}>
                        <span {...editable(docId, "items.2.label", "text")}>{copy.legal}</span>
                        {/* Never annotated, and never wired: the developer's own
                            credit, not the client's content — the same call
                            MyButton is out of scope on. */}
                        <span>© Design&amp;Code C3IStudium</span>
                    </motion.div>

                </motion.div>
            </div>
        </footer>
    );
}
