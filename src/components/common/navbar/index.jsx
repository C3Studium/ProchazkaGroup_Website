'use client'
import NavbarBody from './body';
import { useState, useEffect } from 'react';
import Menu from './menu';
import { AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar () {
    const [menu, setMenu] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Handle scroll to section when URL changes
    useEffect(() => {
        if (pathname === '/o-nas') {
            // Wait for page transition animations to complete (1.5s) then check for hash
            setTimeout(() => {
                if (window.location.hash === '#poradci') {
                    const element = document.querySelector('#poradci');
                    if (element && window.lenis) {
                        window.lenis.scrollTo(element, {
                            offset: window.innerHeight * 0.35,
                            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                        });
                    }
                }
            }, 1500);
        }
    }, [pathname]);

    // Also handle direct navigation to URLs with hash (e.g., page reload)
    useEffect(() => {
        if (pathname === '/o-nas' && window.location.hash === '#poradci') {
            // Shorter delay for direct hash navigation (page reload scenarios)
            setTimeout(() => {
                const element = document.querySelector('#poradci');
                if (element && window.lenis) {
                    window.lenis.scrollTo(element, {
                        offset: window.innerHeight * 0.35,
                        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                    });
                }
            }, 500);
        }
    }, []);
  return (
    <section className='navbar'>
        <Menu menu={menu} setMenu={setMenu} />
        <AnimatePresence mode='sync'>
            {menu && <NavbarBody setMenu={setMenu}/>}
        </AnimatePresence>
    </section>
  ) 
}
