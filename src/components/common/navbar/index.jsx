'use client'
import NavbarBody from './body';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Menu from './menu';
import ContactModal from '@/components/common/ContactModal';
import { onContactRequest } from '@/components/common/ContactModal/open';
import { AnimatePresence } from 'framer-motion';

export default function Navbar({ assistant, contactCopy }) {
    const [menu, setMenu] = useState(false);
    const [contact, setContact] = useState(false);
    const pathname = usePathname();

    // Opening one closes the other. Two full-screen things over the page at
    // once is two ways out and no way to tell which the Escape key meant.
    const openContact = useCallback(() => {
        setMenu(false);
        setContact(true);
    }, []);

    // The menu's boxes that open something instead of going somewhere. Only the
    // contact sheet is a sheet now — the roster stays inside the panel and never
    // reaches this. One handler rather than a prop each, because the panel
    // already carries the name in its own data.
    const openSheet = useCallback((which) => {
        if (which !== 'contact') return;
        setMenu(false);
        setContact(true);
    }, []);

    // The bar is where the sheet lives, and the page is where most of the
    // buttons that want it are — the CTAs that used to navigate to /kontakt.
    // `_app` renders this bar beside the page rather than around it, so the
    // registration below is the seam between the two. See ContactModal/open.
    useEffect(() => onContactRequest(openContact), [openContact]);

    // A link in the panel closes it on the way out, but that is not the only
    // way a route changes underneath it: the back button, a link somewhere
    // else on the page, a redirect. The panel is fixed and would still be
    // hanging over whatever arrived.
    useEffect(() => { setMenu(false); }, [pathname]);

    // Escape closes it, and the page underneath stops scrolling while it is
    // open — the same two things ContactModal does, because from the reader's
    // side they are the same kind of thing over the page.
    //
    // No focus trap, and that is the difference between the two: the sheet is
    // a dialog and traps Tab because leaving it silently is a bug, while this
    // is a menu on a bar. Tab leaving the last link and landing on the page
    // behind is where a menu is supposed to go.
    useEffect(() => {
        if (!menu) return;
        window.lenis?.stop();
        const onKey = (e) => { if (e.key === 'Escape') setMenu(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            window.lenis?.start();
            window.removeEventListener('keydown', onKey);
        };
    }, [menu]);

    return (
        <>
            <Menu menu={menu} setMenu={setMenu} onContact={openContact} />
            <ContactModal open={contact} onClose={() => setContact(false)} assistant={assistant} copy={contactCopy} />
            <AnimatePresence mode='wait'>
                {menu && <NavbarBody key='navPanel' setMenu={setMenu} onSheet={openSheet} />}
            </AnimatePresence>
        </>
    )
}
