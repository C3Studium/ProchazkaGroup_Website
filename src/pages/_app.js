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
import Cursor from "@/components/common/ui/Cursor";
import { Toaster } from "sonner";
// import Footer from "@/components/common/footer";
import SiteFooter from "@/components/common/SiteFooter";

export default function App({ Component, pageProps }) {
  useEditArming();
  const { pathname } = useRouter();

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
