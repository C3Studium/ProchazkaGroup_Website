/**
 * Vzhled webu, přenesený do e-mailu.
 *
 * Hodnoty jsou ZMĚŘENÉ na vykreslené stránce, ne opsané z tokenů: v
 * `src/styles/system/_colors.scss` leží olivová a růžová z nějaké starší
 * podoby webu, zatímco `getComputedStyle` na živé stránce vrací tmavou
 * modrozelenou a azurový akcent. Kdo by je opsal ze souboru, udělal by e-mail
 * v barvách, které web už roky nemá.
 *
 *   pozadí   rgb(2, 14, 21)     #020e15
 *   akcent   rgb(75, 218, 220)  #4bdadc
 *   nadpis   Switzer-Light, váha 300, prostrkání 2.3px
 *
 * Písmo se v e-mailu vynutit nedá — klient stáhne odkazovaný stylopis, nebo
 * taky ne. Rodina proto vždycky končí systémovým bezpatkovým, aby text vypadal
 * střídmě i tam, kde Switzer nedorazí.
 */

export const BRAND = Object.freeze({
    bg: '#020e15',
    panel: '#08161f',
    raised: '#0d1f2a',
    line: 'rgba(255, 255, 255, 0.10)',
    lineStrong: 'rgba(255, 255, 255, 0.22)',
    ink: '#ffffff',
    ink2: 'rgba(255, 255, 255, 0.72)',
    ink3: 'rgba(255, 255, 255, 0.46)',
    accent: '#4bdadc',
    onAccent: '#04222b',
    danger: '#ae0202',
})

export const FONT =
    "'Switzer', 'Switzer-Light', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

/** Adresa webu, ze které si e-mail bere obrázky. Musí být absolutní. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.prochazkagroup.cz').replace(/\/+$/, '')

/** Snímek shaderu z úvodní stránky, ořezaný na pruh hlavičky. */
export const HEADER_IMAGE = `${SITE}/assets/email/hlavicka.jpg`

/** Verzálky s prostrkáním — podpis typografie webu. */
export const caps = (size = 11, spacing = '0.14em') => ({
    fontSize: `${size}px`,
    letterSpacing: spacing,
    textTransform: 'uppercase',
})
