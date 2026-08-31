import "@/styles/globals.scss";
import { useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { LoadProvider } from "@/context/LoadProvider";
import { CursorRefProvider } from "@/context/CursorRefProvider";
import { PerformanceProvider } from "@/context/PerformanceProvider";
import { CookiesProvider } from "@/context/CookiesProvider";
// Visual editing, and the only line of it that is on a public route. It arms
// `editable()` when this document is framed by the Studio's preview host and
// does nothing at all otherwise — the overlay itself is mounted from the host's
// bundle and is never downloaded here. See @/cms/edit/arm.
import { useEditArming } from "@/cms/edit/arm";
// import Transition from "@/components/common/Transition";
// import CookiesBar from "@/components/modems/CookiesBar";
import { Analytics } from "@vercel/analytics/react";
// The shader ground for every page. Loaded client-side only: react-three-fiber
// builds a WebGL context on mount and has nothing to render on the server.
const NeuralTunnel = dynamic(
    () => import("@/components/common/ui/NeuralTunnel"),
    { ssr: false },
);
// The lattice that lights under the cursor. Client-side only for the same
// reason as the shader: it is a canvas and there is nothing to draw on the
// server.
const CursorGrid = dynamic(
    () => import("@/components/common/ui/CursorGrid"),
    { ssr: false },
);
import Navbar from "@/components/common/navbar";
import Preloader from "@/components/common/PreLoader";
import PageVeil from "@/components/common/PageVeil";
// The custom cursor. Client-side only, and for the same reason the shader and
// the lattice above are: there is nothing for the server to draw. It also has
// to answer "is there a pointer here at all" before its first paint — rendered
// on the server it shipped a ring and a dot into the HTML of every phone, which
// were then taken away again on hydration. See its own note.
const Cursor = dynamic(() => import("@/components/common/ui/Cursor"), {
    ssr: false,
});
import { Toaster } from "sonner";
// import Footer from "@/components/common/footer";
import SiteFooter from "@/components/common/SiteFooter";

export default function App({ Component, pageProps }) {
  useEditArming();
  const router = useRouter();
  const { pathname } = router;

  // Which surface this is, for the one rule that has to tell them apart.
  //
  // globals.scss grows the root font size on screens past 1920 so the whole
  // public site scales to a 2K monitor. rem is root-relative and there is only
  // one root, so that would take the Studio with it — a dense admin laid out in
  // px, and explicitly outside this pass. This is what holds it back.
  useEffect(() => {
    const studio = pathname.startsWith("/studio");
    document.documentElement.toggleAttribute("data-studio", studio);
  }, [pathname]);

  useEffect(() => {
    // Initialize Lenis for smooth scrolling
    window.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      lerp: 0.8,
      smoothWheel: true,
      wheelMultiplier: 1.2,
      touchMultiplier: 1.2,
      autoRaf: false,
    });

    function raf(time) {
      window.lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      window.lenis.destroy()
    }
  }, [])

  // Every page opens at its own top, by whichever of the three doors the
  // visitor came through.
  //
  // The browser gets two of them wrong for this site. A reload restores the
  // offset it was left at, and so does a back or forward step — both put the
  // reader down in the middle of a page whose entrances are all keyed to
  // arriving at its start. On /o-nas that is worse than untidy: the hero and
  // the showcase are one pinned mechanism measured from the top of the
  // document, and landing inside it means landing inside an animation that was
  // never played.
  //
  // `manual` turns the browser's own restoration off. Everything after it is
  // done here rather than in PageVeil so that it covers navigations the veil
  // does not drive — a back button, a router.push from anywhere — and not only
  // the ones it does.
  //
  // Placed after the effect above on purpose: effects run in the order they are
  // written, so by the time this one does there is a Lenis to talk to.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const toTop = () => {
      // The Studio keeps its own place. It is a dense admin that scrolls in its
      // own panels and is outside every pass this rule belongs to; sending it
      // home on each of its internal route changes would be a regression, not a
      // fix.
      if (window.location.pathname.startsWith("/studio")) return;
      window.scrollTo(0, 0);
      // Lenis holds a scroll position of its own and would glide the page back
      // to it on the next frame. `immediate` makes this a jump rather than a
      // visible ride; `force` is because the veil stops Lenis for the length of
      // a transition, and a stopped instance ignores a plain scrollTo.
      if (window.lenis) window.lenis.scrollTo(0, { immediate: true, force: true });
    };

    toTop();
    router.events.on("routeChangeComplete", toTop);

    // The third door: a step back into the bfcache. No mount, no route change,
    // and the browser restores the offset itself — so neither of the two above
    // ever hears about it.
    const onShow = (e) => {
      if (e.persisted) toTop();
    };
    window.addEventListener("pageshow", onShow);

    return () => {
      router.events.off("routeChangeComplete", toTop);
      window.removeEventListener("pageshow", onShow);
    };
  }, [router.events])

  return (
    <CookiesProvider>
      <PerformanceProvider>
        <LoadProvider>
          <CursorRefProvider>
            <NeuralTunnel
                className="neural-tunnel--page"
                layers={4}
                falloff={1.15}
                blend={4}
                feedback={3}
                amplitude={1.5}
                scale={5}
                perspective={1}
                zoom={0.2}
                speed={1.25}
                bands={3}
                phase={6}
                spread={0}
                gamut={0.1}
                contrast={2.5}
                vignette={1}
                opacity={1}
                color="#020e15"
                hotColor="#98dbf8"
                backgroundColor="#020e15"
                cursorInteraction={false}
            />
            {/* Sits over the shader and under everything that is read. Values
                are the ones settled on in the generator: a 150px lattice at 10%
                white and a half-pixel stroke, which is the same hairline weight
                as the section rules, so it reads as those rules briefly
                extending rather than as a second system arriving. */}
            <CursorGrid
              className="cursorGrid--page"
              cellSize={150}
              color="#ffffff"
              radius={100}
              falloff="smooth"
              holdTime={250}
              fadeDuration={350}
              lineWidth={0.5}
              maxOpacity={0.25}
              fillOpacity={0}
              gridOpacity={0}
              cellRadius={0}
              clickPulse
              pulseSpeed={2000}
            />
            {/* The contact sheet the navigation opens reads both its copy and
                the person it is addressed to from here: the bar is mounted once,
                outside any page, so they travel on every page's props beside the
                patička. See @/cms/server/site/footer. */}
            <Preloader />
            <PageVeil />
            <Navbar
                assistant={pageProps.assistant || null}
                contactCopy={pageProps.contact || null}
            />
            <Cursor />
            {/* <CookiesBar /> */}
            {/* <BackgroundGradient /> */}
            <Component {...pageProps} />
            {/* The patička belongs to no page, so it travels on every page's
                props. `_app` cannot fetch for itself without
                `App.getInitialProps`, which opts the whole site out of static
                generation; a page with no getStaticProps hands down nothing and
                the footer renders the copy it ships with. See
                @/cms/server/site/footer. */}
            <SiteFooter {...(pageProps.footer || {})} />
            <Analytics />
            <Toaster position="top-center" richColors closeButton={false} toastOptions={{ duration: 3000 }} />
          </CursorRefProvider>
        </LoadProvider>
      </PerformanceProvider>
    </CookiesProvider>
  );
}
