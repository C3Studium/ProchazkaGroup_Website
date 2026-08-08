import SmallButton from "@/components/common/ui/stickyButtons/buttons/SmallButton";
import CookiesModem from "../Cookies";
import { useCookies } from "@/context/CookiesProvider";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function CookiesBar() {
    const [settings, setSettings] = useState(false);
    const {
        acceptAllCookies,
        rejectAllCookies,
        savePreferences,
        COOKIE_CATEGORIES,
        showBanner,
        hasConsented
    } = useCookies();

    // Helper function to handle Clarity consent
    const handleClarityConsent = (analyticsConsent) => {
        try {
            if (typeof window !== 'undefined' && window.clarity) {
                if (analyticsConsent) {
                    window.clarity('consent', true);

                    // Set up user identification
                    window.clarity('identify',
                        `user-${Date.now()}`,
                        `session-${Date.now()}`,
                        window.location.pathname,
                        "Anonymous User"
                    );

                    console.log('✅ Clarity enabled via cookie consent');
                } else {
                    window.clarity('consent', false);
                    console.log('⚠️ Clarity disabled via cookie consent');
                }
            }
        } catch (error) {
            console.warn('❌ Clarity consent update failed:', error);
        }
    };

    const handleAcceptAll = () => {
        acceptAllCookies();
        handleClarityConsent(true);
    };

    const handleAcceptNecessary = () => {
        const necessaryOnly = Object.keys(COOKIE_CATEGORIES).reduce((acc, key) => ({
            ...acc,
            [key]: COOKIE_CATEGORIES[key].required
        }), {});

        savePreferences(necessaryOnly);
        handleClarityConsent(false);
    };

    const handleRejectAll = () => {
        rejectAllCookies();
        handleClarityConsent(false);
    };

    const handleCustomPreferences = (preferences) => {
        savePreferences(preferences);
        handleClarityConsent(preferences.analytics || false);
    };

    return (
        <AnimatePresence mode="wait">
            {showBanner && (
                <motion.div
                    className="cookies__bar"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="cookies__bar__text">
                        <p>
                            Používáme cookies pro základní funkce webu a analýzu návštěvnosti.
                            <a href="/cookies">Více informací</a>
                        </p>
                        <p className="cookies__bar__text__secondary">
                            Kliknutím na tlačítko můžete spravovat své preference nebo přijmout všechna cookies.
                        </p>
                    </div>
                    <div className="cookies__bar__buttons">
                        <div className="cookies__bar__buttons__button">
                            <div onClick={handleAcceptAll}>
                                <SmallButton text="Souhlasím" />
                            </div>
                            <div onClick={handleAcceptNecessary}>
                                <SmallButton text="Nezbytné" />
                            </div>
                            <div onClick={handleRejectAll}>
                                <SmallButton text="Nesouhlasím" />
                            </div>
                        </div>
                        <div className="cookies__bar__buttons__settings">
                            <div onClick={() => setSettings(!settings)}>
                                <SmallButton text="Nastavení" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            <AnimatePresence mode="wait">
                {settings && (
                    <CookiesModem
                        setSettings={setSettings}
                        settings={settings}
                        onSavePreferences={handleCustomPreferences}
                    />
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
}