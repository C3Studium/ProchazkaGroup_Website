// The deliberate scan — DEVELOPMENT ONLY.
//
//   GET /api/studio/audit            every scannable route
//   GET /api/studio/audit?route=/    one of them
//
// `scripts/cms-audit.js` is the thing a person runs; this is where the work
// happens, and it is here rather than in the script because the annotations only
// exist inside a render. `editable()` emits nothing unless editing is armed, and
// what it emits depends on props that came out of the database — so the only way
// to see the real addresses is to render the real components with the real draft
// content, which needs the module graph a Next server already has.
//
// ---------------------------------------------------------------------------
// Arming the flag on a server, which mode.js exists to forbid
//
// `@/cms/edit/mode` states the rule this appears to break: the flag must never
// be true during a server render, because Next renders every page of an app in
// one Node process and a module-scope flag set by one route is set for the
// public route rendering beside it.
//
// The rule holds, and this is inside it rather than around it, for one reason:
// `renderToStaticMarkup` is SYNCHRONOUS. Node runs one thing at a time, there is
// no `await` between the two lines below, and no other render can begin inside a
// synchronous call. The flag is on for the duration of one stack frame and off
// again in a `finally`. A streaming renderer would break this outright and must
// not be substituted.
//
// The second guard is the route itself: it answers 404 in a production build, so
// none of this exists where it would matter.
//
// ---------------------------------------------------------------------------
// What this scan can and cannot see, said plainly
//
// It sees the page's FIRST render. That is every annotation on `/`, and on
// /o-nas it is everything except the history — four panels the reader opens,
// mounted from component state, which no server render reaches. It also does not
// see the patička or the contact sheet, which `_app` mounts and which are not
// part of a page component.
//
// The Studio's editing view covers exactly those: it reads the live document of
// whatever is on screen. The two surfaces are complementary rather than
// redundant, and the report says which one is speaking.

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
// Next's own router context, so `_app` can be rendered outside a request. It is
// an internal path and the only one there is: the site's chrome calls
// `useRouter()`, and a page rendered without a router throws before it has
// emitted a single annotation. A Next upgrade that moves this file makes the
// scan fail loudly with "Vykreslení selhalo" rather than silently report zero.
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime'

import { getType } from '@/cms/core'
import { auditPage, fromHtml, pagesFor } from '@/cms/audit'
import { setEditMode } from '@/cms/edit/mode'
import '@/cms/server/registerSchemas'
import site from '@/cms/site/config'
import {
    getApprovedReviews,
    getAssistant,
    getConsultants,
    getPartners,
    getSiteCopy,
} from '@/cms/server/site/content.js'
import { getContactContent, getFooterContent, getHomepageContent, readerFor } from '@/cms/server/site'

import App from '@/pages/_app'
import Home from '@/pages/index'
// As modules rather than as components: three of the four are rendered with the
// props their OWN getStaticProps answers with, which is what makes this scan
// look at the page the Studio frames instead of at a reconstruction of it.
import * as aboutModule from '@/pages/o-nas'
import * as benefitModule from '@/pages/benefit-program'
import * as cookiesModule from '@/pages/cookies'
import * as offerModule from '@/pages/nabidka'
import * as partnersModule from '@/pages/nabidky'
import * as privacyModule from '@/pages/ochrana-soukromi'
import * as advisorModule from '@/pages/recenze/[slug]'
import * as reviewsModule from '@/pages/recenze'

const SOURCE_READERS = Object.freeze({
    partner: getPartners,
    review: getApprovedReviews,
    consultant: getConsultants,
    assistant: getAssistant,
})

/**
 * The routes this can render, and how each one gets DRAFT props.
 *
 * Three of the four go through the page's own `getStaticProps` with draft mode
 * claimed — `viewOf(context)` is the switch they already read, so what is
 * rendered here is what the Studio's frame renders, down to the reader. The
 * homepage is the exception for the reason `/studio/preview/home` exists:
 * `src/pages/index.js` calls `getHomepageContent()` with no arguments and must
 * keep doing so, so the draft is fetched for it here.
 *
 * /recenze/[slug] is the one entry that cannot take `ownProps` unchanged: its
 * `getStaticProps` is handed `params`, and a template has no address of its own.
 * The slug of the first published consultant is used — any of them renders the
 * same block, which is the whole point of that block being page copy.
 */
const SCANNABLE = Object.freeze({
    '/': {
        component: Home,
        // The three the homepage's own getStaticProps does not fetch in draft —
        // `/` may not, and `/studio/preview/home` is where the switch lives. The
        // patička and the contact sheet are `_app`'s and belong to no page, so
        // they have to be handed down here or the scan would miss every
        // annotation on them.
        props: async () => {
            const view = { draft: true }
            const [content, footer, contact, assistant] = await Promise.all([
                getHomepageContent(view),
                getFooterContent(view),
                getContactContent(view),
                getAssistant({ read: readerFor(view) }),
            ])
            return { content, footer, contact, assistant }
        },
    },
    '/o-nas': { component: aboutModule.default, props: () => ownProps(aboutModule) },
    '/nabidka': { component: offerModule.default, props: () => ownProps(offerModule) },
    '/nabidky': { component: partnersModule.default, props: () => ownProps(partnersModule) },
    '/benefit-program': { component: benefitModule.default, props: () => ownProps(benefitModule) },
    '/cookies': { component: cookiesModule.default, props: () => ownProps(cookiesModule) },
    '/ochrana-soukromi': { component: privacyModule.default, props: () => ownProps(privacyModule) },
    '/recenze': { component: reviewsModule.default, props: () => ownProps(reviewsModule) },
    '/recenze/[slug]': {
        component: advisorModule.default,
        props: async () => {
            const [consultant] = await getConsultants({ kind: 'consultant', read: readerFor({ draft: true }) })
            // No published consultant with a slug means no page to scan. Empty
            // props render the card with `advisor` undefined, which throws — so
            // the scan says so instead, through the handler's own catch.
            if (!consultant?.slug) throw new Error('žádný publikovaný poradce se slugem')
            return ownProps(advisorModule, { params: { slug: consultant.slug } })
        },
    },
})

/** A page's own getStaticProps, with draft mode claimed. */
const ownProps = async (module, context = {}) =>
    (await module.getStaticProps({ draftMode: true, ...context }))?.props || {}

/**
 * The router the chrome reads, and nothing more of one.
 *
 * `_app` asks for `pathname` and the navigation asks for `asPath` — both to
 * decide which link is the current page. Every method is a no-op: nothing is
 * clicked during a render, and a stub that throws would turn an ordinary render
 * into a failed scan.
 */
const stubRouter = (route) => ({
    pathname: route,
    route,
    asPath: route,
    basePath: '',
    query: {},
    isReady: true,
    isPreview: false,
    isFallback: false,
    isLocaleDomain: false,
    events: { on() {}, off() {}, emit() {} },
    push: async () => true,
    replace: async () => true,
    prefetch: async () => undefined,
    back() {},
    forward() {},
    reload() {},
    beforePopState() {},
})

/** See the note at the head of this file before touching these three lines. */
const armedMarkup = (element) => {
    setEditMode(true)
    try {
        return renderToStaticMarkup(element)
    } finally {
        setEditMode(false)
    }
}

/**
 * Every document the routes could have annotated, by id.
 *
 * Read rather than derived from the props: a `data-cms-doc` is an id, and what
 * the check needs is the `key` and the stored body behind it. The same readers
 * the page itself used, through the same draft reader — one extra round trip for
 * a scan a person asked for.
 */
const documentsOf = async (pages) => {
    const read = readerFor({ draft: true })
    const byId = new Map()

    // The globals first, and not as an afterthought: `_app` renders the patička
    // and the contact sheet under every route, so their documents are on every
    // page this scans and an id missing from here reads as an annotation
    // pointing at nothing. `defineGlobals` declares no fields, so nothing of
    // theirs reaches the configuration comparison — the check they get is the
    // schema one, and the report counts them as such.
    for (const page of [site.globals, ...pages]) {
        if (page.copy) {
            const copy = await getSiteCopy({ page: page.copy, read })
            for (const [key, block] of Object.entries(copy)) {
                if (block?.id) byId.set(block.id, { type: 'siteCopy', key, body: block })
            }
        }
        for (const source of Object.values(page.sources)) {
            const reader = SOURCE_READERS[source.type]
            if (!reader) continue
            const { type, ...options } = source
            const rows = await reader({ ...options, read })
            for (const row of [].concat(rows || [])) {
                if (row?.id) byId.set(row.id, { type, key: null, body: row })
            }
        }
    }
    return byId
}

const scan = async (route) => {
    const entry = SCANNABLE[route]
    const pages = pagesFor(site, route)
    const props = await entry.props()
    // Rendering and reading the documents are separate round trips on purpose:
    // the render must be one synchronous call, so nothing may be awaited inside
    // it.
    const router = stubRouter(route)
    const markup = armedMarkup(
        createElement(
            RouterContext.Provider,
            { value: router },
            createElement(App, { Component: entry.component, pageProps: props, router }),
        ),
    )
    const documents = await documentsOf(pages)

    const result = auditPage({
        route,
        pages,
        annotations: fromHtml(markup),
        documentFor: (id) => documents.get(id) || null,
        typeFor: (name) => getType(name) || null,
    })
    return { route, ...result }
}

export default async function handler(req, res) {
    // The whole feature, absent from a production build. Not a permission check —
    // there is nothing here to permit.
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ code: 'not-found', message: 'Kontrola anotací běží jen ve vývoji.' })
    }
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ code: 'invalid', message: 'Metoda není povolena, použijte GET' })
    }

    const asked = typeof req.query.route === 'string' ? req.query.route : null
    if (asked && !SCANNABLE[asked]) {
        return res.status(400).json({
            code: 'invalid',
            message: `"${asked}" se nedá projít. Známé adresy: ${Object.keys(SCANNABLE).join(', ')}`,
        })
    }

    const started = Date.now()
    const routes = []
    for (const route of asked ? [asked] : Object.keys(SCANNABLE)) {
        try {
            routes.push(await scan(route))
        } catch (error) {
            routes.push({
                route,
                findings: [],
                counts: { annotations: 0, addresses: 0, checkedAgainstConfig: 0 },
                notes: [`Vykreslení "${route}" selhalo: ${error?.message || error}`],
                failed: true,
            })
        }
    }

    return res.status(200).json({ routes, ms: Date.now() - started })
}
