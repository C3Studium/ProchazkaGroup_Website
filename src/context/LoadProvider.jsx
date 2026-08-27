// LoadProvider.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

const LoadContext = createContext();

export function LoadProvider({ children }) {
    const [firstLoad, setFirstLoad] = useState(false);

    // The preloader gate. "hold" while the first-load curtain owns the screen,
    // "go" from the moment its mask starts opening — hero sections read this
    // as the cue for their entrance. Initialized synchronously from the
    // attribute the _document inline script stamps before first paint, so a
    // hero never starts its entrance under the curtain. Safe against
    // hydration: the flag only ever drives `animate` props, never markup.
    const [gate, setGate] = useState(() =>
        typeof document !== "undefined" &&
        document.documentElement.hasAttribute("data-preload")
            ? "hold"
            : "go",
    );

    const value = useMemo(
        () => ({ firstLoad, setFirstLoad, gate, setGate }),
        [firstLoad, gate],
    );

    return (
        <LoadContext.Provider value={value}>
            {children}
        </LoadContext.Provider>
    );
}

export function useGlobalContext() {
    const context = useContext(LoadContext);
    if (context === undefined) {
        throw new Error('useGlobalContext must be used within a LoadProvider');
    }
    const { firstLoad, setFirstLoad, gate, setGate, runTime } = context;
    return { firstLoad, setFirstLoad, gate, setGate, runTime };
}