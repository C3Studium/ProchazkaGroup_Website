export const FooterLinks = [
    {
        name: 'Facebook',
        href: 'https://www.facebook.com/prochazka.group'
    },
    {
        name: 'Instagram',
        href: 'https://www.instagram.com/prochazka.group/'
    },
    {
        name: 'Benefit Program',
        href: '/benefit-program'
    },
    {
        name: 'Kontakt',
        href: '/kontakt'
    },
    
]


// The seven links in the panel, in the order they are read.
//
// PORADCI is `/o-nas#poradci` — a section of the page O NÁS also opens. It is
// here because it is what a visitor is actually looking for often enough to be
// worth its own word, not because it is its own route.
//
// `photo` is shown twice while the link is the one being reached for: filling
// the panel behind everything, dimmed, and again sharp in the plate at the
// centre. One file, two renderings, so the plate reads as a window cut into the
// panel rather than as a second picture.
//
// NOT assets/seo/*. Those are Open Graph share cards with the page's headline
// baked into the bitmap — mainpage.webp carries "Budujeme pro lidi stabilní a
// kvalitní finanční poradenství" across it, which at plate size is a paragraph
// of unreadable type and at panel size is a headline competing with the menu's
// own words. (assets/seo/reviews.webp is also a broken 24x24 file.) These are
// photographs.
//
// `note` is one line, and it is the reason to go there rather than a
// description of what is there.
// The order here is the order the panel is read in — top row left to right,
// then the bottom row — and everything downstream takes it from this list: the
// numbers on the boxes, and which way a photograph arrives in the window
// (anything earlier in this list comes down from above, anything later rises
// from below). Reorder this and all three follow. Split them and the numbers
// read as shuffled and the pictures change direction for no reason anyone
// looking at the screen could see.
export const NavPages = [
    {
        href: '/',
        text: 'Hlavní stránka',
        note: 'Kde to začíná.',
        photo: { src: '/assets/backgrounds/about.webp', alt: 'Tým Procházka Group' }
    },
    {
        href: '/nabidka',
        text: 'Nabídka',
        note: 'Proč vůbec potřebujete poradce.',
        photo: { src: '/assets/backgrounds/wallet_2000.webp', alt: 'Otevřená peněženka s hotovostí' }
    },
    {
        href: '/benefit-program',
        text: 'Benefit program',
        note: 'Odměny po příčkách.',
        photo: { src: '/assets/backgrounds/goldTrophies.webp', alt: 'Ocenění Procházka Group' }
    },
    {
        // No href: this one opens the contact sheet rather than going anywhere.
        // It is in the menu as well as in the bar because the bar's word is one
        // line of type at the top of the screen and this is the panel someone
        // opened *looking* for a way to get in touch.
        modal: 'contact',
        text: 'Kontakt',
        note: 'Ozvěte se. Odpovídáme týž den.',
        photo: { src: '/assets/backgrounds/callBG.webp', alt: 'Poradce Procházka Group na telefonu' }
    },
    {
        href: '/o-nas',
        text: 'O nás',
        note: 'Lidé, historie, kancelář v Písku.',
        photo: { src: '/assets/backgrounds/mainOffice.webp', alt: 'Kancelář Procházka Group v Písku' }
    },
    {
        // Opens the advisors sheet rather than going anywhere. `/o-nas#poradci`
        // is still the roster's home and still where the page's own links go;
        // this is the menu offering the same people without making the reader
        // leave whatever they were in the middle of.
        modal: 'advisors',
        text: 'Poradci',
        note: 'Vyberte si, kdo vám sedne.',
        photo: { src: '/assets/backgrounds/conferenceFront.webp', alt: 'Poradci Procházka Group' }
    },
    {
        href: '/recenze',
        text: 'Recenze',
        note: 'Co říkají klienti, celé.',
        photo: { src: '/assets/backgrounds/conference.webp', alt: 'Klienti na semináři Procházka Group' }
    },
    {
        href: '/nabidky',
        text: 'Partneři',
        note: 'Banky a pojišťovny, se kterými pracujeme.',
        photo: { src: '/assets/backgrounds/logoBannerBG.webp', alt: 'Vlaječka OVB na jednacím stole' }
    }
]

export const NavAddLinks = [
    {
        href: '/ochrana-soukromi',
        text: 'Ochrana osobních údajů'
    },
    {
        href: '/cookies',
        text: 'Cookies'
    }
]

export const NavIcons = [
    {
        href: 'https://www.facebook.com/prochazka.group',
        src: '/facebook.svg',
        text: 'Facebook'
    },
    {
        href: 'https://www.instagram.com/prochazka.group/',
        src: '/instagram.svg',
        text: 'Instagram'
    },
    // {
    //     href: 'https://www.linkedin.com/',
    //     src: '/linkedin.svg',
    //     text: 'LinkedIn'
    // },
    // {
    //     href: 'https://www.twitter.com/',
    //     src: '/twitter.svg',
    //     text: 'Twitter'
    // },
    // {
    //     href: 'https://www.youtube.com/',
    //     src: '/youtube.svg',
    //     text: 'YouTube'
    // }
]