import { PrefKey, getPref, setPref } from "../modules/preferences";
import { SCRIPT_VERSION } from "./global";
import { UserAgent } from "./user-agent";

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
}


export function disablePwa() {
    const userAgent = ((window.navigator as any).orgUserAgent || window.navigator.userAgent || '').toLowerCase();
    if (!userAgent) {
        return;
    }

    // Check if it's Safari on mobile
    if (UserAgent.isSafari(true)) {
        // Disable the PWA prompt
        Object.defineProperty(window.navigator, 'standalone', {
            value: true,
        });
    }
}
