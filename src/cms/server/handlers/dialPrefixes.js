// /api/cms/dial-prefixes — které země nabízí pole s telefonním číslem.
//
//   GET /api/cms/dial-prefixes    seznam předvoleb    (bez session)
//   PUT /api/cms/dial-prefixes    změnit ho           (vlastník)
//
// ---------------------------------------------------------------------------
// Proč to není pod /settings, a proč GET nemá kontrolu session
// ---------------------------------------------------------------------------
//
// handlers/settings.js drží invariant, který stojí za udržení: všechno pod
// /api/cms/settings/* vyžaduje vlastníka, kontrolovaného před jakoukoli větví,
// takže trasa přidaná tam nemůže přijít bez té kontroly. Veřejně čitelný
// endpoint by byl ta výjimka, kvůli které ta věta přestane platit, a jedné
// výjimky v seznamu deseti si nikdo nevšimne. Čtení tedy bydlí na vlastní
// adrese a pravidlo toho jmenného prostoru zůstává absolutní. Přesně tak
// a ze stejného důvodu to má handlers/widget.js.
//
// ČTENÍ JE BEZ PŘIHLÁŠENÍ ZÁMĚRNĚ. Ten seznam potřebuje každý formulář
// s telefonem na veřejném webu, tedy prohlížeč návštěvníka, který žádnou
// session nemá a mít nemá. A co se odpovídá, je číselník států: „+420 je
// Česko" stojí v každé encyklopedii a není to tajemství podle žádného čtení.
// migrations/0006 v komentáři té tabulky říká, že se do ní nic tajného ukládat
// nesmí, právě kvůli endpointům jako je tenhle.
//
// ZÁPIS JE JEN PRO VLASTNÍKA, kontrolovaný tady, při každém volání. To je ta
// pojistka. Studio navíc panel editorovi schová — to je zdvořilost, ne kontrola,
// a odpoví se 403, ať si rozhraní myslelo cokoli.

import { requireOwner } from '../auth.js'
import { readDialPrefixes, writeDialPrefixes } from '../dialPrefixes.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

export const handleDialPrefixes = async (req, res, segments) => {
    if (segments.length) return methodNotAllowed(res, ['GET', 'PUT'])

    if (req.method === 'GET') {
        // sendJson nastavuje no-store. Tady schválně, ne zděděně: vlastník,
        // který zemi přidá, čeká ji ve formuláři při dalším načtení stránky,
        // a odpověď z cache by změnu vydávala za neuloženou.
        return sendJson(res, 200, { items: await readDialPrefixes() })
    }

    if (req.method === 'PUT') {
        const actor = await requireOwner(req, res)
        const body = await readJson(req)
        // Přijme se `{ items }` i holé pole. Tvar na drátě je `{ items }` —
        // viz GET výš — ale klient, který pošle pole, myslel totéž a odmítnout
        // ho by bylo přesnostní cvičení bez adresáta.
        const list = Array.isArray(body) ? body : body?.items
        return sendJson(res, 200, { items: await writeDialPrefixes(actor, list) })
    }

    return methodNotAllowed(res, ['GET', 'PUT'])
}
