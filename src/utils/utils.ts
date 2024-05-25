import { PrefKey, getPref, setPref } from "@utils/preferences";
import { AppInterface, SCRIPT_VERSION } from "@utils/global";
import { UserAgent } from "@utils/user-agent";
import { Translations } from "./translation";

/**
 * Check for update
 */
export function checkForUpdate() {
    const CHECK_INTERVAL_SECONDS = 2 * 3600; // check every 2 hours

    const currentVersion = getPref(PrefKey.CURRENT_VERSION);
    const lastCheck = getPref(PrefKey.LAST_UPDATE_CHECK);
    const now = Math.round((+new Date) / 1000);

    if (currentVersion === SCRIPT_VERSION && now - lastCheck < CHECK_INTERVAL_SECONDS) {
        return;
    }

    // Start checking
    setPref(PrefKey.LAST_UPDATE_CHECK, now);
    fetch('https://api.github.com/repos/redphx/better-xcloud/releases/latest')
        .then(response => response.json())
        .then(json => {
            // Store the latest version
            setPref(PrefKey.LATEST_VERSION, json.tag_name.substring(1));
            setPref(PrefKey.CURRENT_VERSION, SCRIPT_VERSION);
        });

    // Update translations
    Translations.updateTranslations(true);
}


/**
 * Disable PWA requirement on Safari
 */
export function disablePwa() {
    const userAgent = ((window.navigator as any).orgUserAgent || window.navigator.userAgent || '').toLowerCase();
    if (!userAgent) {
        return;
    }

    // Check if it's Safari on mobile
    if (!!AppInterface || UserAgent.isSafari(true)) {
        // Disable the PWA prompt
        Object.defineProperty(window.navigator, 'standalone', {
            value: true,
        });
    }
}


/**
 * Calculate hash code from a string
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
export function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32-bit integer
    }

    return hash;
}


export function renderString(str: string, obj: any){
    return str.replace(/\$\{.+?\}/g, match => {
        const key = match.substring(2, match.length - 1);
        if (key in obj) {
            return obj[key];
        }

        return match;
    });
}


export function ceilToNearest(value: number, interval: number): number {
    return Math.ceil(value / interval) * interval;
}

export function floorToNearest(value: number, interval: number): number {
    return Math.floor(value / interval) * interval;
}

export function roundToNearest(value: number, interval: number): number {
    return Math.round(value / interval) * interval;
}
