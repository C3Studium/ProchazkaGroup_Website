export const trackEvent = (eventName, data = {}) => {
    try {
        // Check consent first...
        const cookiePreferences = document.cookie
            .split('; ')
            .find(row => row.startsWith('cookiePreferences='));
            
        if (cookiePreferences) {
            const preferences = JSON.parse(decodeURIComponent(cookiePreferences.split('=')[1]));
            
            if (!preferences.analytics) {
                console.log(`⚠️ Analytics disabled - event not tracked: ${eventName}`);
                return;
            }
        } else {
            console.log(`⚠️ No cookie consent - event not tracked: ${eventName}`);
            return;
        }

        if (typeof window !== 'undefined' && window.clarity) {
            // Track the event
            window.clarity('event', eventName);
            
            // Set custom tags
            if (Object.keys(data).length > 0) {
                Object.entries(data).forEach(([key, value]) => {
                    window.clarity('set', key, String(value));
                });
            }
            
            // Upgrade session for important events
            const importantEvents = [
                'qna_submitted_successfully',
                'contact_phone_button_clicked',
                'contact_message_button_clicked',
                'benefit_reminder_phone_copied_successfully'
            ];
            
            if (importantEvents.includes(eventName)) {
                window.clarity('upgrade', `Important event: ${eventName}`);
                console.log(`🚀 Session upgraded for: ${eventName}`);
            }
            
            console.log(`✅ Clarity event tracked: ${eventName}`, data);
        } else {
            console.warn('⚠️ Clarity not available yet');
        }
        
    } catch (error) {
        console.warn('❌ Clarity tracking failed:', error);
        console.log(`📊 Fallback tracking: ${eventName}`, {
            timestamp: new Date().toISOString(),
            ...data
        });
    }
};

// Helper function to identify users (call this when you know user info)
export const identifyUser = (userId, sessionId = null, pageId = null, friendlyName = null) => {
    try {
        if (typeof window !== 'undefined' && window.clarity) {
            window.clarity('identify', 
                userId,
                sessionId || `session-${Date.now()}`,
                pageId || window.location.pathname,
                friendlyName || "Anonymous User"
            );
            console.log(`✅ User identified: ${userId}`);
        } else {
            console.warn('⚠️ Clarity not available for user identification');
        }
    } catch (error) {
        console.warn('❌ User identification failed:', error);
    }
};

// Helper function to set consent
export const setClarityConsent = (hasConsent) => {
    try {
        if (typeof window !== 'undefined' && window.clarity) {
            window.clarity('consent', hasConsent);
            console.log(`✅ Clarity consent set: ${hasConsent}`);
        } else {
            console.warn('⚠️ Clarity not available for consent setting');
        }
    } catch (error) {
        console.warn('❌ Clarity consent failed:', error);
    }
};

// Helper function to upgrade session (for important events)
export const upgradeSession = (reason) => {
    try {
        if (typeof window !== 'undefined' && window.clarity) {
            window.clarity('upgrade', reason);
            console.log(`✅ Session upgraded: ${reason}`);
        } else {
            console.warn('⚠️ Clarity not available for session upgrade');
        }
    } catch (error) {
        console.warn('❌ Session upgrade failed:', error);
    }
};