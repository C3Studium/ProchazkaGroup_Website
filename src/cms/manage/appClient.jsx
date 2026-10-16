'use client'

// Klientská hranice pro App Router.
//
// V Pages Routeru sedí obojí v `_app`, který je klientský celý. V App Routeru
// je layout SERVEROVÁ komponenta, takže `useEditArming` (hook) ani `ManageBadge`
// (`next/dynamic`) se do něj naimportovat nedají — a bez nich App Router
// instalace tiše nemá vizuální editaci ani cestu do ní. Tenhle soubor je ta
// hranice, aby ji layout mohl vložit jedním prvkem.
//
//     import StudioClient from '@c3studium/valecms/manage/appClient.jsx'
//     …
//     <body>{children}<StudioClient /></body>

import { useEditArming } from '../edit/arm.js'
import ManageBadge from './index.jsx'

export default function StudioClient() {
    useEditArming()
    return <ManageBadge />
}
