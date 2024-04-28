import { PrefKey, getPref } from "./preferences";

export enum UserAgentProfile {
    EDGE_WINDOWS = 'edge-windows',
    SAFARI_MACOS = 'safari-macos',
    SMARTTV_TIZEN = 'smarttv-tizen',
    DEFAULT = 'default',
    CUSTOM = 'custom',
}

let CHROMIUM_VERSION = '123.0.0.0';
if (!!(window as any).chrome) {
    // Get Chromium version in the original User-Agent value
    const match = window.navigator.userAgent.match(/\s(?:Chrome|Edg)\/([\d\.]+)/);
    if (match) {
        CHROMIUM_VERSION = match[1];
    }
}

// Repace Chromium version
let EDGE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/[[VERSION]] Safari/537.36 Edg/[[VERSION]]';
EDGE_USER_AGENT = EDGE_USER_AGENT.replaceAll('[[VERSION]]', CHROMIUM_VERSION);

export class UserAgent {
    static #USER_AGENTS = {
        [UserAgentProfile.EDGE_WINDOWS]: EDGE_USER_AGENT,
        [UserAgentProfile.SAFARI_MACOS]: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1',
        [UserAgentProfile.SMARTTV_TIZEN]: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) 94.0.4606.31/7.0 TV Safari/537.36',
    }

    static getDefault(): string {
        return (window.navigator as any).orgUserAgent || window.navigator.userAgent;
    }

    static get(profile: UserAgentProfile): string {
        const defaultUserAgent = UserAgent.getDefault();
        if (profile === UserAgentProfile.CUSTOM) {
            return getPref(PrefKey.USER_AGENT_CUSTOM);
        }

        return (UserAgent.#USER_AGENTS as any)[profile] || defaultUserAgent;
    }

    static isSafari(mobile=false) {
        const userAgent = (UserAgent.getDefault() || '').toLowerCase();
        let result = userAgent.includes('safari') && !userAgent.includes('chrom');

        if (result && mobile) {
            result = userAgent.includes('mobile');
        }

        return result;
    }

    static spoof() {
        let newUserAgent;

        const profile = getPref(PrefKey.USER_AGENT_PROFILE);
        if (profile === UserAgentProfile.DEFAULT) {
            return;
        }

        if (!newUserAgent) {
            newUserAgent = UserAgent.get(profile);
        }

        // Clear data of navigator.userAgentData, force xCloud to detect browser based on navigator.userAgent
        Object.defineProperty(window.navigator, 'userAgentData', {});

        // Override navigator.userAgent
        (window.navigator as any).orgUserAgent = window.navigator.userAgent;
        Object.defineProperty(window.navigator, 'userAgent', {
            value: newUserAgent,
        });

        return newUserAgent;
    }
}
