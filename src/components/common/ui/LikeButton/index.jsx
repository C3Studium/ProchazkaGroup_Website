import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";

/**
 * „Líbí se" — jedno tlačítko, dvě místa.
 *
 * Tvarem je to sourozenec toho telefonního na /o-nás: kroužek, ikona, nic víc.
 * Jiná ikona a jiná funkce, jak bylo zadáno — a `button`, ne `a`, protože tohle
 * nikam nevede. Ta záměna je jediný důvod, proč to není jen zkopírovaný styl:
 * odkaz, který se tváří jako tlačítko, se chová špatně na klávesnici i pro
 * odečítač obrazovky.
 *
 * Počet se drží vedle, ne uvnitř: uvnitř by kroužek při každém přičtení změnil
 * šířku a řádek by poskočil.
 */
export default function LikeButton({
    liked = false,
    count = 0,
    busy = false,
    label = "Líbí se mi",
    onToggle,
    size = 18,
}) {
    const Icon = liked ? RiHeart3Fill : RiHeart3Line;

    return (
        <span className="LikeBtn" data-liked={liked ? "true" : undefined}>
            <button
                type="button"
                className="LikeBtn__hit"
                // The state IS the label. „Líbí se mi" on a pressed button would
                // read as an instruction to do the thing already done.
                aria-label={liked ? `${label} — zrušit` : label}
                aria-pressed={liked}
                disabled={busy}
                data-cursor="frame"
                onClick={onToggle}
            >
                <Icon size={size} aria-hidden="true" />
            </button>
            <span className="LikeBtn__count" aria-hidden="true">
                {count}
            </span>
        </span>
    );
}
