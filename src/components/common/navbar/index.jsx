'use client'
import NavbarBody from './body';
import { useState } from 'react';
import Menu from './menu';
import { AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const [menu, setMenu] = useState(false);

    return (
        <>
            <Menu menu={menu} setMenu={setMenu} />
            <AnimatePresence mode='wait'>
                {menu && <NavbarBody setMenu={setMenu} />}
            </AnimatePresence>
        </>
    )
}
