import { UserAgentProfile } from "@enums/user-agent";
import { BX_FLAGS } from "./bx-flags";

type UserAgentConfig = {
    profile: UserAgentProfile,
    custom?: string,
};

const SMART_TV_UNIQUE_ID = 'FC4A1DA2-711C-4E9C-BC7F-047AF8A672EA';

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

    static #isMobile: boolean | null = null;
    static #isSafari: boolean | null = null;
    static #isSafariMobile: boolean | null = null;

    static #USER_AGENTS: PartialRecord<UserAgentProfile, string> = {
        [UserAgentProfile.WINDOWS_EDGE]: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION} Safari/537.36 Edg/${CHROMIUM_VERSION}`,
        [UserAgentProfile.MACOS_SAFARI]: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1',
        [UserAgentProfile.SMART_TV_GENERIC]: `${window.navigator.userAgent} SmartTV`,
        [UserAgentProfile.SMART_TV_TIZEN]: `Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROMIUM_VERSION}/7.0 TV Safari/537.36 ${SMART_TV_UNIQUE_ID}`,
        [UserAgentProfile.VR_OCULUS]: window.navigator.userAgent + ' OculusBrowser VR',
    }

    static init() {
        UserAgent.#config = JSON.parse(window.localStorage.getItem(UserAgent.STORAGE_KEY)  || '{}') as UserAgentConfig;
        if (!UserAgent.#config.profile) {
            UserAgent.#config.profile = (BX_FLAGS.DeviceInfo.deviceType === 'android-tv' || BX_FLAGS.DeviceInfo.deviceType === 'webos') ? UserAgentProfile.VR_OCULUS : UserAgentProfile.DEFAULT;
        }

        if (!UserAgent.#config.custom) {
            UserAgent.#config.custom = '';
        }

        UserAgent.spoof();
    }

    static updateStorage(profile: UserAgentProfile, custom?: string) {
        const config = UserAgent.#config;
        config.profile = profile;

        if (profile === UserAgentProfile.CUSTOM && typeof custom !== 'undefined') {
            config.custom = custom;
        }

        window.localStorage.setItem(UserAgent.STORAGE_KEY, JSON.stringify(config));
    }

    static getDefault(): string {
        return (window.navigator as any).orgUserAgent || window.navigator.userAgent;
    }

    static get(profile: UserAgentProfile): string {
        const defaultUserAgent = window.navigator.userAgent;

        switch (profile) {
            case UserAgentProfile.DEFAULT:
                return defaultUserAgent;

            case UserAgentProfile.CUSTOM:
                return UserAgent.#config.custom || defaultUserAgent;

            default:
                return UserAgent.#USER_AGENTS[profile] || defaultUserAgent;
        }
    }

    static isSafari(): boolean {
        if (this.#isSafari !== null) {
            return this.#isSafari;
        }

        const userAgent = UserAgent.getDefault().toLowerCase();
        let result = userAgent.includes('safari') && !userAgent.includes('chrom');

        this.#isSafari = result;
        return result;
    }

    static isSafariMobile(): boolean {
        if (this.#isSafariMobile !== null) {
            return this.#isSafariMobile;
        }

        const userAgent = UserAgent.getDefault().toLowerCase();
        const result = this.isSafari() && userAgent.includes('mobile');

        this.#isSafariMobile = result;
        return result;
    }

    static isMobile(): boolean {
        if (this.#isMobile !== null) {
            return this.#isMobile;
        }

        const userAgent = UserAgent.getDefault().toLowerCase();
        const result = /iphone|ipad|android/.test(userAgent);

        this.#isMobile = result;
        return result;
    }

    static spoof() {
        const profile = UserAgent.#config.profile;
        if (profile === UserAgentProfile.DEFAULT) {
            return;
        }

        let newUserAgent = UserAgent.get(profile);

        // Clear data of navigator.userAgentData, force xCloud to detect browser based on navigator.userAgent
        if ('userAgentData' in window.navigator) {
            (window.navigator as any).orgUserAgentData = (window.navigator as any).userAgentData;
            Object.defineProperty(window.navigator, 'userAgentData', {});
        }

        // Override navigator.userAgent
        (window.navigator as any).orgUserAgent = window.navigator.userAgent;
        Object.defineProperty(window.navigator, 'userAgent', {
            value: newUserAgent,
        });
    }
}
