import "@/styles/globals.scss";
import { useEffect } from "react";
import Lenis from "lenis";
import { LoadProvider } from "@/context/LoadProvider";
import { CursorRefProvider } from "@/context/CursorRefProvider";
import { Toaster } from "@/components/ui/toaster";
import { PerformanceProvider } from "@/context/PerformanceProvider";
import { CookiesProvider } from "@/context/CookiesProvider";
import Transition from "@/components/common/Transition";
import CookiesBar from "@/components/modems/Cookies";
import { Analytics } from "@vercel/analytics/react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Initialize Lenis for smooth scrolling
    window.lenis = new Lenis({
      duration: 1.2,           
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      lerp: 0.8,               
      smoothWheel: true,       
      wheelMultiplier: 1,      
      touchMultiplier: 1,      
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
                  <CookiesBar />
                  <Component {...pageProps} />
                  <Analytics />
                  <Toaster />
              </Transition>
          </CursorRefProvider>
        </LoadProvider>
      </PerformanceProvider>
    </CookiesProvider>
  );
}