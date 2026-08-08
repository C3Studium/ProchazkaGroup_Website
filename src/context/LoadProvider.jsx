// LoadProvider.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

const LoadContext = createContext();

export function LoadProvider({ children }) {
    const [firstLoad, setFirstLoad] = useState(true);




    useEffect(() => {
        const timer = setTimeout(() => {
            setFirstLoad(false);
            document.body.style.overflow = '';
        }, 3000);

        document.body.style.overflow = 'hidden';
        return () => clearTimeout(timer);
    }, [firstLoad]);

    // Memoize context value to prevent unnecessary re-renders
    // change this when the preloader will be ready to run normally
    const value = useMemo(() => ({ firstLoad, setFirstLoad }), [firstLoad]);

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
    const { firstLoad, setFirstLoad, runTime } = context;
    return { firstLoad, setFirstLoad, runTime };
}