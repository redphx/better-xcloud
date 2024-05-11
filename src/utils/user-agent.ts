type UserAgentConfig = {
    profile: UserAgentProfile,
    custom?: string,
};

export enum UserAgentProfile {
    WINDOWS_EDGE = 'windows-edge',
    MACOS_SAFARI = 'macos-safari',
    SMARTTV_GENERIC = 'smarttv-generic',
    SMARTTV_TIZEN = 'smarttv-tizen',
    VR_OCULUS = 'vr-oculus',
    ANDROID_KIWI_V123 = 'android-kiwi-v123',
    DEFAULT = 'default',
    CUSTOM = 'custom',
}

let CHROMIUM_VERSION = '123.0.0.0';
if (!!(window as any).chrome || window.navigator.userAgent.includes('Chrome')) {
    // Get Chromium version in the original User-Agent value
    const match = window.navigator.userAgent.match(/\s(?:Chrome|Edg)\/([\d\.]+)/);
    if (match) {
        CHROMIUM_VERSION = match[1];
    }
}

export class UserAgent {
    static readonly STORAGE_KEY = 'better_xcloud_user_agent';
    static #config: UserAgentConfig;

    static #USER_AGENTS: PartialRecord<UserAgentProfile, string> = {
        [UserAgentProfile.WINDOWS_EDGE]: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION} Safari/537.36 Edg/${CHROMIUM_VERSION}`,
        [UserAgentProfile.MACOS_SAFARI]: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1',
        [UserAgentProfile.SMARTTV_GENERIC]: window.navigator.userAgent + ' SmartTV',
        [UserAgentProfile.SMARTTV_TIZEN]: `Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROMIUM_VERSION}/7.0 TV Safari/537.36`,
        [UserAgentProfile.VR_OCULUS]: window.navigator.userAgent + ' OculusBrowser VR',
        [UserAgentProfile.ANDROID_KIWI_V123]: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36',
    }

    static init() {
        UserAgent.#config = JSON.parse(window.localStorage.getItem(UserAgent.STORAGE_KEY)  || '{}') as UserAgentConfig;
        if (!UserAgent.#config.profile) {
            UserAgent.#config.profile = UserAgentProfile.DEFAULT;
        }

        if (!UserAgent.#config.custom) {
            UserAgent.#config.custom = '';
        }
    }

    static updateStorage(profile: UserAgentProfile, custom?: string) {
        const clonedConfig = structuredClone(UserAgent.#config);
        clonedConfig.profile = profile;

        if (typeof custom !== 'undefined') {
            clonedConfig.custom = custom;
        }

        window.localStorage.setItem(UserAgent.STORAGE_KEY, JSON.stringify(clonedConfig));
    }

    static getDefault(): string {
        return (window.navigator as any).orgUserAgent || window.navigator.userAgent;
    }

    static get(profile: UserAgentProfile): string {
        const defaultUserAgent = UserAgent.getDefault();
        if (profile === UserAgentProfile.CUSTOM) {
            return UserAgent.#config.custom || '';
        }

        return (UserAgent.#USER_AGENTS as any)[profile] || defaultUserAgent;
    }

    static isSafari(mobile=false): boolean {
        const userAgent = (UserAgent.getDefault() || '').toLowerCase();
        let result = userAgent.includes('safari') && !userAgent.includes('chrom');

        if (result && mobile) {
            result = userAgent.includes('mobile');
        }

        return result;
    }

    static isMobile(): boolean {
        const userAgent = (UserAgent.getDefault() || '').toLowerCase();
        return /iphone|ipad|android/.test(userAgent);
    }

    static spoof() {
        let newUserAgent;

        const profile = UserAgent.#config.profile;
        if (profile === UserAgentProfile.DEFAULT) {
            return;
        }

        if (!newUserAgent) {
            newUserAgent = UserAgent.get(profile);
        }

        // Clear data of navigator.userAgentData, force xCloud to detect browser based on navigator.userAgent
        (window.navigator as any).orgUserAgentData = (window.navigator as any).userAgentData;
        Object.defineProperty(window.navigator, 'userAgentData', {});

        // Override navigator.userAgent
        (window.navigator as any).orgUserAgent = window.navigator.userAgent;
        Object.defineProperty(window.navigator, 'userAgent', {
            value: newUserAgent,
        });

        return newUserAgent;
    }
}
