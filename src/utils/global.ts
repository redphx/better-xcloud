import type { BaseSettingsStore } from "./settings-storages/base-settings-storage";
import { UserAgent } from "./user-agent";

export const SCRIPT_VERSION = Bun.env.SCRIPT_VERSION!;
export const SCRIPT_VARIANT = Bun.env.BUILD_VARIANT! as BuildVariant;

export const AppInterface = window.AppInterface;

UserAgent.init();
const userAgent = window.navigator.userAgent.toLowerCase();

const isTv = userAgent.includes('smart-tv') || userAgent.includes('smarttv') || /\baft.*\b/.test(userAgent);
const isVr = window.navigator.userAgent.includes('VR') && window.navigator.userAgent.includes('OculusBrowser');
const browserHasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const userAgentHasTouchSupport = !isTv && !isVr && browserHasTouchSupport;

export const STATES: BxStates = {
    supportedRegion: true,
    serverRegions: {},
    selectedRegion: {},
    gsToken: '',
    isSignedIn: false,

    isPlaying: false,
    appContext: {},

    browser: {
        capabilities: {
            touch: browserHasTouchSupport,
            batteryApi: 'getBattery' in window.navigator,
        },
    },

    userAgent: {
        isTv: isTv,
        capabilities: {
            touch: userAgentHasTouchSupport,
        }
    },

    currentStream: {},
    remotePlay: {},

    pointerServerPort: 9269,
};

export const STORAGE: {[key: string]: BaseSettingsStore} = {};

export function deepClone(obj: any): any {
    if ('structuredClone' in window) {
        return structuredClone(obj);
    }

    if (!obj) {
        return {};
    }

    return JSON.parse(JSON.stringify(obj));
}
