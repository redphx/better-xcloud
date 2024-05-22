import { UserAgent } from "./user-agent";

export const SCRIPT_VERSION = Bun.env.SCRIPT_VERSION;
export const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

export const AppInterface = window.AppInterface;

UserAgent.init();
const userAgent = window.navigator.userAgent.toLowerCase();

const isTv = userAgent.includes('smart-tv') || userAgent.includes('smarttv') || /\baft.*\b/.test(userAgent);
const isVr = window.navigator.userAgent.includes('VR') && window.navigator.userAgent.includes('OculusBrowser');
const browserHasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const hasTouchSupport = !isTv && !isVr && browserHasTouchSupport;

export const STATES: BxStates = {
    isPlaying: false,
    appContext: {},
    serverRegions: {},
    hasTouchSupport: hasTouchSupport,
    browserHasTouchSupport: browserHasTouchSupport,

    currentStream: {},
    remotePlay: {},
};
