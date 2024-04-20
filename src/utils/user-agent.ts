import { PrefKey, Preferences, getPref } from "../modules/preferences";

export enum UserAgentProfile {
    EDGE_WINDOWS = 'edge-windows',
    SAFARI_MACOS = 'safari-macos',
    SMARTTV_TIZEN = 'smarttv-tizen',
    DEFAULT = 'default',
    CUSTOM = 'custom',
}

export class UserAgent {
    static #USER_AGENTS = {
        [UserAgentProfile.EDGE_WINDOWS]: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188',
        [UserAgentProfile.SAFARI_MACOS]: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1',
        [UserAgentProfile.SMARTTV_TIZEN]: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) 94.0.4606.31/7.0 TV Safari/537.36',
    }

    static getDefault(): string {
        return (window.navigator as any).orgUserAgent || window.navigator.userAgent;
    }

    static get(profile: string): string {
        const defaultUserAgent = UserAgent.getDefault();
        if (profile === UserAgentProfile.CUSTOM) {
            return getPref(PrefKey.USER_AGENT_CUSTOM);
        }

        // TODO: check type
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
