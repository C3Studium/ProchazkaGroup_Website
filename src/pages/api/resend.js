// /api/resend — ZRUŠENO. Odpovídá 410 a nic neposílá.
//
// Tahle trasa brala příjemce z těla požadavku:
//
//     const { template, to, data = {} } = req.body
//     await resend.emails.send({ from: …, to, subject, react: … })
//
// Bez session, bez limitu, bez seznamu povolených adres. To znamená, že kdokoli
// na světě mohl POSTnout požadavek a odeslat e-mail z ověřené domény
// prochazkagroup.cz komukoli, s libovolným obsahem z deseti připravených
// šablon. Není to chybějící kontrola, je to otevřená relay — a následek nenese
// ten, kdo ji použije, ale doména, která skončí na blacklistu.
//
// Nahradilo to /api/forms: klient posílá název formuláře a vyplněná data,
// příjemce zná výhradně server (@/lib/mail/forms). Nic na webu tuhle trasu
// nevolalo — jediné odkazy na ni byly ukázky v komentářích — takže zrušení
// nikomu nic nebere.
//
// 410 a ne 404: 410 znamená „bylo a není", což je přesně ta informace, kterou
// potřebuje kdokoli, kdo má tu adresu zapsanou ve vlastním skriptu. A ne tiché
// 200, protože odpovědět „odesláno" na něco, co se neodeslalo, je to jediné
// chování, které je horší než původní stav.
//
// Soubor se dá smazat. Zůstává proto, že adresa byla veřejná a bylo by lepší,
// aby řekla, co se stalo, než aby zmizela.

export default function handler(req, res) {
    res.setHeader('Allow', '')
    return res.status(410).json({
        error: 'Tato trasa byla zrušena. Formuláře odesílá POST /api/forms.',
    })
}
