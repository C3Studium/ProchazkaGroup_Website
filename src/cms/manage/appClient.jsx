'use client'

// Klientská hranice pro App Router.
//
// V Pages Routeru sedí obojí v `_app`, který je klientský celý. V App Routeru
// je layout SERVEROVÁ komponenta, takže `useEditArming` (hook) ani `ManageBadge`
// (`next/dynamic`) se do něj naimportovat nedají — a bez nich App Router
// instalace tiše nemá vizuální editaci ani cestu do ní. Tenhle soubor je ta
// hranice, aby ji layout mohl vložit jedním prvkem.
//
//     import StudioClient from '@/cms/manage/appClient'
//     …
//     <body>{children}<StudioClient /></body>

import { useEditArming } from '@/cms/edit/arm'
import ManageBadge from '@/cms/manage'

export default function StudioClient() {
    useEditArming()
    return <ManageBadge />
}
