import { hasAnalyticsConsent } from "@/helpers/consent";

// Tracking is best-effort: none of these ever logs or throws. A visitor without
// consent, a blocked Clarity script or a failed call all end the same way —
// nothing is sent and the page carries on.
const clarity = (...args) => {
    if (typeof window === 'undefined' || typeof window.clarity !== 'function') return false;
    try {
        window.clarity(...args);
        return true;
    } catch {
        return false;
    }
};

// Upgrade session for important events
const IMPORTANT_EVENTS = [
    'qna_submitted_successfully',
    'contact_phone_button_clicked',
    'contact_message_button_clicked',
    'benefit_reminder_phone_copied_successfully'
];

export const trackEvent = (eventName, data = {}) => {
    if (!hasAnalyticsConsent()) return;
    if (!clarity('event', eventName)) return;

    Object.entries(data).forEach(([key, value]) => {
        clarity('set', key, String(value));
    });

    if (IMPORTANT_EVENTS.includes(eventName)) {
        clarity('upgrade', `Important event: ${eventName}`);
    }
};

// Helper function to identify users (call this when you know user info)
export const identifyUser = (userId, sessionId = null, pageId = null, friendlyName = null) => {
    if (!hasAnalyticsConsent()) return;
    clarity('identify',
        userId,
        sessionId || `session-${Date.now()}`,
        pageId || window.location.pathname,
        friendlyName || "Anonymous User"
    );
};

// Helper function to set consent
export const setClarityConsent = (hasConsent) => {
    clarity('consent', hasConsent);
};

// Helper function to upgrade session (for important events)
export const upgradeSession = (reason) => {
    if (!hasAnalyticsConsent()) return;
    clarity('upgrade', reason);
};
