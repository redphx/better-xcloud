import { UserAgent } from "./user-agent";

export const SCRIPT_VERSION = Bun.env.SCRIPT_VERSION!;

export const AppInterface = window.AppInterface;

UserAgent.init();
const userAgent = window.navigator.userAgent.toLowerCase();

const isTv = userAgent.includes('smart-tv') || userAgent.includes('smarttv') || /\baft.*\b/.test(userAgent);
const isVr = window.navigator.userAgent.includes('VR') && window.navigator.userAgent.includes('OculusBrowser');
const browserHasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const userAgentHasTouchSupport = !isTv && !isVr && browserHasTouchSupport;

export const STATES: BxStates = {
    isPlaying: false,
    appContext: {},
    serverRegions: {},
    userAgentHasTouchSupport: userAgentHasTouchSupport,
    browserHasTouchSupport: browserHasTouchSupport,

    currentStream: {},
    remotePlay: {},

    pointerServerPort: 9269,
};

export function deepClone(obj: any): any {
    if ('structuredClone' in window) {
        return structuredClone(obj);
    }

    if (!obj) {
        return obj;
    }

    return JSON.parse(JSON.stringify(obj));
}
