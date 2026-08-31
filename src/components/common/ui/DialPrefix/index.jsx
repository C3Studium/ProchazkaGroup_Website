"use client";

import { RiArrowDownSLine } from "@remixicon/react";
import { DIAL_PREFIXES } from "@/constants/dialPrefixes";

// The dialling prefix beside a telephone field, as one control.
//
// It keeps the `prefix` class it replaces, and that is the whole integration
// strategy: three forms style `.telRow .prefix` themselves — the contact sheet
// at 0.9rem in 55% white, the homepage's advisor form and the QnA form each
// their own — and inheriting from them is what lets one component sit in all
// three without any of them being re-drawn. The stylesheet here only takes the
// browser's own select chrome off; everything that makes it look like this site
// still comes from the form around it.
//
// A native <select> rather than a built menu, for the same reasons the advisor
// pickers are one: it is a list of thirteen short strings, the platform already
// draws a good one on every device, and on a phone that means the OS wheel
// rather than a scrolling div inside a sheet that is itself scrolling.
//
// WHAT IT SHOWS. Codes, and only codes.
//
// The country names were in the option text to begin with, and that was wrong
// for a reason worth writing down: a native select is as wide as its widest
// option and shows the selected option's text in full. So "Spojené království"
// set the width for all of them — measured at 179px — and the closed control
// read "+420 Česko" with the number field pushed out to the right of it. On a
// phone that is most of the row spent before the number starts.
//
// Bare codes make the control 55px and the closed state read as what it is: the
// front of a telephone number. The country is kept as each option's `title`, so
// it is still there for anyone who hovers or whose reader announces it, and the
// list in constants/dialPrefixes is ordered so the two that matter are first.
export default function DialPrefix({
    value,
    onChange,
    name = "dial",
    // The pipe two of these forms draw after the prefix. Part of the field's
    // rule-work rather than of this control, so it is passed rather than
    // assumed — the QnA form does not have one.
    separator = false,
    size = 16,
    ...rest
}) {
    // Controlled where the form holds its values, uncontrolled where it does
    // not — the QnA form reads its fields off the DOM on submit and has no
    // state to put this in. Passing `value={undefined}` alongside a
    // `defaultValue` is React's own warning, so the prop is left off entirely
    // rather than passed as undefined.
    const bind = value === undefined ? {} : { value, onChange };

    return (
        <span className="prefix DialPrefix">
            <select
                className="DialPrefix__select"
                name={name}
                {...bind}
                // The code is what is read out, but a screen reader landing on
                // "+421" alone has no idea what it has selected.
                aria-label="Předvolba země"
                data-cursor="frame"
                {...rest}
            >
                {DIAL_PREFIXES.map((entry) => (
                    <option key={entry.iso} value={entry.code} title={entry.label}>
                        {entry.code}
                    </option>
                ))}
            </select>
            <RiArrowDownSLine className="DialPrefix__chevron" size={size} aria-hidden="true" />
            {separator ? <span className="DialPrefix__rule">|</span> : null}
        </span>
    );
}
