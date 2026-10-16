// /api/resend-enhanced — ZRUŠENO. Odpovídá 410 a nic neposílá.
//
// Totéž co /api/resend, viz tam: příjemce z těla požadavku, bez session, bez
// limitu. Tady o stupeň horší, protože ta trasa navíc psala servisním klíčem do
// tabulky `email_interactions` — takže kdokoli mohl kromě odeslání e-mailu
// zakládat řádky v databázi.
//
// Nic ji nevolalo. Měla i druhé vady, které stojí za zápis, kdyby se k tomu
// někdo chtěl vracet:
//
//   - odesílala z `FROM_EMAIL || 'noreply@prochazka.group'` — jiná proměnná
//     a jiná doména (`.group`) než zbytek webu, který jede na
//     `RESEND_FROM_EMAIL` a `prochazkagroup.cz`. Ta proměnná v .env není,
//     takže by to padalo na doménu, která tu není ověřená.
//   - segmentovala příjemce podle historie otevření a psala o tom do e-mailu
//     („našemu nejaktivnějšímu klientovi"). To je vlastnost, kterou si někdo
//     musí vybrat, ne něco, co se stane cestou.
//
// Odesílání formulářů teď jede přes /api/forms (@/lib/mail/forms). Kdyby se
// někdy chtělo měřit otevření a kliky, umí to Resend sám přes `tags` a webhooky
// a nepotřebuje k tomu vlastní tabulku ani veřejnou trasu.
//
// Soubor se dá smazat; zůstává, aby zrušená veřejná adresa řekla, co se stalo.

export default function handler(req, res) {
    res.setHeader('Allow', '')
    return res.status(410).json({
        error: 'Tato trasa byla zrušena. Formuláře odesílá POST /api/forms.',
    })
}
