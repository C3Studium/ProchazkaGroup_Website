import "@/styles/globals.scss";
import { useEffect } from "react";
import Lenis from "lenis";
import { LoadProvider } from "@/context/LoadProvider";
import { CursorRefProvider } from "@/context/CursorRefProvider";
import { PerformanceProvider } from "@/context/PerformanceProvider";
import { CookiesProvider } from "@/context/CookiesProvider";
import Transition from "@/components/common/Transition";
import CookiesBar from "@/components/modems/CookiesBar";
import { Analytics } from "@vercel/analytics/react";
import BackgroundGradient from "@/components/common/Background";
import Navbar from "@/components/common/navbar";
import Cursor from "@/components/common/navbar/cursor";
import { Toaster } from "sonner";
import Footer from "@/components/common/footer";

export default function App({ Component, pageProps }) {
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
            <Transition>
              <Navbar />
              <Cursor />
              {/* <CookiesBar /> */}
              <BackgroundGradient />
              <Component {...pageProps} />
              <Footer />
              <Analytics />
              <Toaster position="top-center" richColors closeButton={false} toastOptions={{ duration: 3000 }} />
            </Transition>
          </CursorRefProvider>
        </LoadProvider>
      </PerformanceProvider>
    </CookiesProvider>
  );
}
